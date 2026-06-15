from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.project import Project, ProjectMember
from app.models.space import Space, SpaceMember
from app.models.task import Task as TaskModel
from app.models.user import User
from app.schemas.auth import SignupRequest
from app.schemas.project import Project as ProjectSchema
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.schemas.space import Space as SpaceSchema
from app.schemas.space import SpaceCreate, SpaceMember as SpaceMemberSchema
from app.schemas.space import SpaceMemberCreate, SpaceMemberUpdate, SpaceUpdate
from app.schemas.task import Task, TaskCreate, TaskUpdate
from app.schemas.user import UserProfile, UserSyncRequest


class DuplicateProjectNameError(Exception):
    pass


class DuplicateSpaceNameError(Exception):
    pass


class SpaceMemberAlreadyExistsError(Exception):
    pass


class SpaceMemberNotFoundError(Exception):
    pass


class UserNotFoundError(Exception):
    pass


def get_space_member_role(db: Session, space_id: int, user_id: int) -> str | None:
    member = db.get(SpaceMember, {"space_id": space_id, "user_id": user_id})
    return member.role if member is not None else None


def has_space_role(db: Session, space_id: int, user_id: int, allowed_roles: set[str]) -> bool:
    role = get_space_member_role(db, space_id, user_id)
    return role in allowed_roles


def get_project_space_id(db: Session, project_id: int) -> int | None:
    project = db.get(Project, project_id)
    if project is None or project.status != "active":
        return None
    return project.space_id


def get_task_space_id(db: Session, task_id: int) -> int | None:
    task = db.get(TaskModel, task_id)
    if task is None:
        return None

    project = db.get(Project, task.project_id)
    if project is None or project.status != "active":
        return None
    return project.space_id


def _to_project_schema(project: Project) -> ProjectSchema:
    return ProjectSchema.model_validate(project)


def _to_space_schema(space: Space) -> SpaceSchema:
    return SpaceSchema.model_validate(space)


def _to_task_schema(task: TaskModel) -> Task:
    return Task.model_validate(
        {
            "id": task.id,
            "title": task.title,
            "project_id": task.project_id,
            "status": task.status,
            "due": task.due,
            "assignee": task.assignee_name,
            "assignee_id": task.assignee_id,
            "description": task.description,
            "creator_id": task.creator_id,
        }
    )


def _to_user_profile(user: User) -> UserProfile:
    return UserProfile.model_validate(user)


def _to_space_member_schema(member: SpaceMember, user: User) -> SpaceMemberSchema:
    return SpaceMemberSchema(
        space_id=member.space_id,
        user_id=member.user_id,
        email=user.email,
        display_name=user.display_name,
        role=member.role,
    )


def list_spaces(db: Session, user_id: int) -> list[SpaceSchema]:
    spaces = db.scalars(
        select(Space)
        .join(SpaceMember, Space.id == SpaceMember.space_id)
        .where(Space.status == "active", SpaceMember.user_id == user_id)
        .order_by(Space.id.asc())
    ).all()
    return [_to_space_schema(space) for space in spaces]


def get_space(db: Session, space_id: int) -> SpaceSchema | None:
    space = db.get(Space, space_id)
    if space is None or space.status != "active":
        return None
    return _to_space_schema(space)


def create_space(db: Session, payload: SpaceCreate, creator_id: int) -> SpaceSchema | None:
    existing_space = db.scalar(
        select(Space).where(
            Space.creator_id == creator_id,
            Space.name == payload.name,
            Space.status == "active",
        )
    )
    if existing_space is not None:
        return None

    space = Space(
        name=payload.name,
        description=payload.description,
        creator_id=creator_id,
    )
    db.add(space)
    db.flush()
    db.add(SpaceMember(space_id=space.id, user_id=creator_id, role="admin"))
    db.commit()
    db.refresh(space)
    return _to_space_schema(space)


def update_space(db: Session, space_id: int, payload: SpaceUpdate, user_id: int) -> SpaceSchema | None:
    space = db.get(Space, space_id)
    if space is None or space.status != "active":
        return None

    updates = payload.model_dump(exclude_unset=True)
    if "name" in updates:
        existing_space = db.scalar(
            select(Space).where(
                Space.creator_id == user_id,
                Space.name == updates["name"],
                Space.status == "active",
                Space.id != space_id,
            )
        )
        if existing_space is not None:
            raise DuplicateSpaceNameError

    for field, value in updates.items():
        setattr(space, field, value)

    db.commit()
    db.refresh(space)
    return _to_space_schema(space)


def delete_space(db: Session, space_id: int) -> bool:
    space = db.get(Space, space_id)
    if space is None or space.status != "active":
        return False

    db.delete(space)
    db.commit()
    return True


def list_space_members(db: Session, space_id: int) -> list[SpaceMemberSchema]:
    rows = db.execute(
        select(SpaceMember, User)
        .join(User, SpaceMember.user_id == User.id)
        .where(SpaceMember.space_id == space_id)
        .order_by(SpaceMember.role.asc(), User.display_name.asc())
    ).all()
    return [_to_space_member_schema(member, user) for member, user in rows]


def add_space_member(db: Session, space_id: int, payload: SpaceMemberCreate) -> SpaceMemberSchema:
    space = db.get(Space, space_id)
    if space is None or space.status != "active":
        raise SpaceMemberNotFoundError

    user = db.scalar(select(User).where(User.email == payload.email, User.is_active.is_(True)))
    if user is None:
        raise UserNotFoundError

    existing_member = db.get(SpaceMember, {"space_id": space_id, "user_id": user.id})
    if existing_member is not None:
        raise SpaceMemberAlreadyExistsError

    member = SpaceMember(space_id=space_id, user_id=user.id, role=payload.role)
    db.add(member)
    db.commit()
    db.refresh(member)
    return _to_space_member_schema(member, user)


def update_space_member(db: Session, space_id: int, user_id: int, payload: SpaceMemberUpdate) -> SpaceMemberSchema:
    member = db.get(SpaceMember, {"space_id": space_id, "user_id": user_id})
    if member is None:
        raise SpaceMemberNotFoundError

    user = db.get(User, user_id)
    if user is None:
        raise UserNotFoundError

    member.role = payload.role
    db.commit()
    db.refresh(member)
    return _to_space_member_schema(member, user)


def remove_space_member(db: Session, space_id: int, user_id: int) -> bool:
    member = db.get(SpaceMember, {"space_id": space_id, "user_id": user_id})
    if member is None:
        return False

    db.delete(member)
    db.commit()
    return True


def list_projects(db: Session, space_id: int | None = None) -> list[ProjectSchema]:
    query = select(Project).where(Project.status == "active").order_by(Project.id.asc())
    if space_id is not None:
        query = query.where(Project.space_id == space_id)
    projects = db.scalars(query).all()
    return [_to_project_schema(project) for project in projects]


def get_project(db: Session, project_id: int) -> ProjectSchema | None:
    project = db.get(Project, project_id)
    if project is None:
        return None
    return _to_project_schema(project)


def has_project(db: Session, project_id: int) -> bool:
    return db.get(Project, project_id) is not None


def _get_or_create_default_space(db: Session, user_id: int) -> Space:
    space = db.scalar(select(Space).where(Space.status == "active").order_by(Space.id.asc()).limit(1))
    if space is not None:
        return space

    space = Space(
        name="PMS Workspace",
        description="Default workspace.",
        creator_id=user_id,
    )
    db.add(space)
    db.flush()
    db.add(SpaceMember(space_id=space.id, user_id=user_id, role="admin"))
    return space


def create_project(db: Session, payload: ProjectCreate, creator_id: int) -> ProjectSchema | None:
    space = db.get(Space, payload.space_id) if payload.space_id is not None else _get_or_create_default_space(db, creator_id)
    if space is None or space.status != "active":
        return None

    existing_project = db.scalar(
        select(Project).where(
            Project.space_id == space.id,
            Project.name == payload.name,
            Project.status == "active",
        )
    )
    if existing_project is not None:
        return None

    project = Project(
        space_id=space.id,
        name=payload.name,
        emoji=payload.emoji,
        description=payload.description,
        creator_id=creator_id,
    )
    db.add(project)
    db.flush()
    db.add(ProjectMember(project_id=project.id, user_id=creator_id, role="admin"))
    db.commit()
    db.refresh(project)
    return _to_project_schema(project)


def update_project(db: Session, project_id: int, payload: ProjectUpdate) -> ProjectSchema | None:
    project = db.get(Project, project_id)
    if project is None or project.status != "active":
        return None

    updates = payload.model_dump(exclude_unset=True)
    if "name" in updates:
        existing_project = db.scalar(
            select(Project).where(
                Project.space_id == project.space_id,
                Project.name == updates["name"],
                Project.status == "active",
                Project.id != project_id,
            )
        )
        if existing_project is not None:
            raise DuplicateProjectNameError

    for field, value in updates.items():
        setattr(project, field, value)

    db.commit()
    db.refresh(project)
    return _to_project_schema(project)


def delete_project(db: Session, project_id: int) -> bool:
    project = db.get(Project, project_id)
    if project is None or project.status != "active":
        return False

    db.execute(delete(TaskModel).where(TaskModel.project_id == project_id))
    db.execute(delete(ProjectMember).where(ProjectMember.project_id == project_id))
    db.delete(project)
    db.commit()
    return True


def list_tasks(db: Session, project_id: int | None = None, space_id: int | None = None) -> list[Task]:
    query = select(TaskModel).order_by(TaskModel.position.asc(), TaskModel.id.asc())
    if project_id is not None:
        query = query.where(TaskModel.project_id == project_id)
    if space_id is not None:
        query = query.join(Project, TaskModel.project_id == Project.id).where(Project.space_id == space_id)
    tasks = db.scalars(query).all()
    return [_to_task_schema(task) for task in tasks]


def get_task(db: Session, task_id: int) -> Task | None:
    task = db.get(TaskModel, task_id)
    if task is None:
        return None
    return _to_task_schema(task)


def create_task(db: Session, payload: TaskCreate, creator_id: int | None = None) -> Task:
    max_position = db.scalar(
        select(TaskModel.position)
        .where(TaskModel.project_id == payload.project_id)
        .order_by(TaskModel.position.desc())
        .limit(1)
    )
    next_position = 0 if max_position is None else max_position + 1

    task = TaskModel(
        project_id=payload.project_id,
        title=payload.title,
        status=payload.status,
        due=payload.due,
        assignee_name=payload.assignee,
        assignee_id=payload.assignee_id,
        description=payload.description,
        creator_id=creator_id or payload.creator_id or 1,
        position=next_position,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return _to_task_schema(task)


def update_task(db: Session, task_id: int, payload: TaskUpdate) -> Task | None:
    task = db.get(TaskModel, task_id)
    if task is None:
        return None

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        if field == "assignee":
            task.assignee_name = value
        else:
            setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return _to_task_schema(task)


def delete_task(db: Session, task_id: int) -> bool:
    task = db.get(TaskModel, task_id)
    if task is None:
        return False

    db.delete(task)
    db.commit()
    return True


def sync_user(db: Session, payload: UserSyncRequest) -> UserProfile:
    user = db.scalar(
        select(User).where(
            User.auth_provider == payload.auth_provider,
            User.provider_user_id == payload.provider_user_id,
        )
    )

    if user is None:
        user = db.scalar(select(User).where(User.email == payload.email))

    if user is None:
        user = User(
            email=payload.email,
            display_name=payload.display_name,
            auth_provider=payload.auth_provider,
            provider_user_id=payload.provider_user_id,
            is_active=True,
        )
        db.add(user)
    else:
        user.email = payload.email
        user.display_name = payload.display_name
        user.auth_provider = payload.auth_provider
        user.provider_user_id = payload.provider_user_id
        user.is_active = True

    db.commit()
    db.refresh(user)
    return _to_user_profile(user)


def create_local_user(db: Session, payload: SignupRequest) -> User | None:
    existing_user = db.scalar(select(User).where(User.email == payload.email))
    if existing_user is not None:
        return None

    user = User(
        email=payload.email,
        display_name=payload.display_name,
        auth_provider="local",
        provider_user_id=payload.email,
        password_hash=hash_password(payload.password),
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_local_user(db: Session, email: str, password: str) -> User | None:
    user = db.scalar(select(User).where(User.email == email, User.auth_provider == "local"))
    if user is None or not verify_password(password, user.password_hash):
        return None
    return user
