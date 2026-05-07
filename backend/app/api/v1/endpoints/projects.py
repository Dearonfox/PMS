from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.repositories import db_store
from app.schemas.project import Project
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


@router.get("/{project_id}/tasks", response_model=list[Task])
def list_project_tasks(project_id: int, db: Session = Depends(get_db)) -> list[Task]:
    project = db_store.get_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return db_store.list_tasks(db, project_id=project_id)
