from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.repositories import db_store
from app.schemas.user import UserProfile, UserSyncRequest

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/sync", response_model=UserProfile)
def sync_user(payload: UserSyncRequest, db: Session = Depends(get_db)) -> UserProfile:
    return db_store.sync_user(db, payload)
