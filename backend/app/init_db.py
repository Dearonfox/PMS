from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import Base, engine
from app.models import Project, ProjectMember, Space, SpaceMember, Task, User


def create_tables() -> None:
    Base.metadata.create_all(bind=engine)


def seed_database() -> None:
    with Session(engine) as db:
        existing_user = db.scalar(select(User).where(User.email == "owner@pms.local"))
        if existing_user is not None:
            return

        owner = User(
            email="owner@pms.local",
            display_name="PMS Owner",
            auth_provider="seed",
            provider_user_id="seed-owner",
            bio="Initial seeded owner account for local development.",
        )
        db.add(owner)
        db.flush()

        space = Space(
            name="PMS Workspace",
            description="Seed workspace for local development.",
            creator_id=owner.id,
        )
        db.add(space)
        db.flush()

        db.add(
            SpaceMember(
                space_id=space.id,
                user_id=owner.id,
                role="admin",
            )
        )

        projects = [
            Project(space_id=space.id, name="PMS Core", emoji="[CORE]", creator_id=owner.id),
            Project(space_id=space.id, name="UI Bench", emoji="[UI]", creator_id=owner.id),
            Project(space_id=space.id, name="DB Design", emoji="[DB]", creator_id=owner.id),
        ]
        db.add_all(projects)
        db.flush()

        db.add_all(
            [
                ProjectMember(project_id=project.id, user_id=owner.id, role="admin")
                for project in projects
            ]
        )

        task_rows = [
            Task(
                project_id=projects[2].id,
                title="Define project and task structure",
                status="Todo",
                due="Today",
                assignee_name="Min",
                description="Document the first project/task relationship.",
                creator_id=owner.id,
                position=0,
            ),
            Task(
                project_id=projects[1].id,
                title="Build Asana-style sidebar",
                status="In Progress",
                due="Tomorrow",
                assignee_name="Jin",
                description="Create the first navigation shell for the PMS.",
                creator_id=owner.id,
                position=0,
            ),
            Task(
                project_id=projects[0].id,
                title="Finish Firebase login flow",
                status="Done",
                assignee_name="Alex",
                description="Confirm email login and Google login both work.",
                creator_id=owner.id,
                position=0,
            ),
        ]
        db.add_all(task_rows)
        db.commit()
