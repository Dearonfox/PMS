from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.v1.endpoints.auth import get_current_user
from app.db import get_db
from app.models.user import User
from app.repositories import db_store
from app.schemas.task import Task, TaskCreate, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=list[Task])
def list_tasks(project_id: int | None = Query(default=None), db: Session = Depends(get_db)) -> list[Task]:
    return db_store.list_tasks(db, project_id=project_id)


@router.get("/{task_id}", response_model=Task)
def get_task(task_id: int, db: Session = Depends(get_db)) -> Task:
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
    return db_store.create_task(db, payload, creator_id=current_user.id)


@router.patch("/{task_id}", response_model=Task)
def update_task(
    task_id: int,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Task:
    if payload.project_id is not None and not db_store.has_project(db, payload.project_id):
        raise HTTPException(status_code=404, detail="Project not found")

    task = db_store.update_task(db, task_id, payload)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> dict[str, bool]:
    deleted = db_store.delete_task(db, task_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"deleted": True}
