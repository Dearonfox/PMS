from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.v1.endpoints.auth import get_current_user
from app.db import get_db
from app.models.user import User
from app.repositories import db_store
from app.schemas.task import Task, TaskCreate, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])
SPACE_READ_ROLES = {"admin", "member", "viewer"}
SPACE_WRITE_ROLES = {"admin", "member"}


def require_space_role(db: Session, space_id: int, user_id: int, allowed_roles: set[str]) -> None:
    if db_store.get_space(db, space_id) is None:
        raise HTTPException(status_code=404, detail="Space not found")
    if not db_store.has_space_role(db, space_id, user_id, allowed_roles):
        raise HTTPException(status_code=403, detail="Not enough permissions")


def require_project_space_role(db: Session, project_id: int, user_id: int, allowed_roles: set[str]) -> None:
    space_id = db_store.get_project_space_id(db, project_id)
    if space_id is None:
        raise HTTPException(status_code=404, detail="Project not found")
    require_space_role(db, space_id, user_id, allowed_roles)


def require_task_space_role(db: Session, task_id: int, user_id: int, allowed_roles: set[str]) -> None:
    space_id = db_store.get_task_space_id(db, task_id)
    if space_id is None:
        raise HTTPException(status_code=404, detail="Task not found")
    require_space_role(db, space_id, user_id, allowed_roles)


@router.get("", response_model=list[Task])
def list_tasks(
    project_id: int | None = Query(default=None),
    space_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Task]:
    if space_id is not None:
        require_space_role(db, space_id, current_user.id, SPACE_READ_ROLES)
    if project_id is not None:
        require_project_space_role(db, project_id, current_user.id, SPACE_READ_ROLES)
    return db_store.list_tasks(db, project_id=project_id, space_id=space_id)


@router.get("/{task_id}", response_model=Task)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Task:
    require_task_space_role(db, task_id, current_user.id, SPACE_READ_ROLES)
    task = db_store.get_task(db, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("", response_model=Task, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Task:
    if not db_store.has_project(db, payload.project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    require_project_space_role(db, payload.project_id, current_user.id, SPACE_WRITE_ROLES)
    return db_store.create_task(db, payload, creator_id=current_user.id)


@router.patch("/{task_id}", response_model=Task)
def update_task(
    task_id: int,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Task:
    require_task_space_role(db, task_id, current_user.id, SPACE_WRITE_ROLES)
    if payload.project_id is not None and not db_store.has_project(db, payload.project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    if payload.project_id is not None:
        require_project_space_role(db, payload.project_id, current_user.id, SPACE_WRITE_ROLES)

    task = db_store.update_task(db, task_id, payload)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, bool]:
    require_task_space_role(db, task_id, current_user.id, SPACE_WRITE_ROLES)
    deleted = db_store.delete_task(db, task_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"deleted": True}
