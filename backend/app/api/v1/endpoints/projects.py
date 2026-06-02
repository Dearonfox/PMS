from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.endpoints.auth import get_current_user
from app.db import get_db
from app.models.user import User
from app.repositories import db_store
from app.schemas.project import Project, ProjectCreate, ProjectUpdate
from app.schemas.task import Task

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[Project])
def list_projects(db: Session = Depends(get_db)) -> list[Project]:
    return db_store.list_projects(db)


@router.get("/{project_id}", response_model=Project)
def get_project(project_id: int, db: Session = Depends(get_db)) -> Project:
    project = db_store.get_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.post("", response_model=Project, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Project:
    project = db_store.create_project(db, payload, creator_id=current_user.id)
    if project is None:
        raise HTTPException(status_code=409, detail="Project already exists")
    return project


@router.patch("/{project_id}", response_model=Project)
def update_project(
    project_id: int,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Project:
    try:
        project = db_store.update_project(db, project_id, payload)
    except db_store.DuplicateProjectNameError:
        raise HTTPException(status_code=409, detail="Project already exists") from None

    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> dict[str, bool]:
    deleted = db_store.delete_project(db, project_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"deleted": True}


@router.get("/{project_id}/tasks", response_model=list[Task])
def list_project_tasks(project_id: int, db: Session = Depends(get_db)) -> list[Task]:
    project = db_store.get_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return db_store.list_tasks(db, project_id=project_id)
