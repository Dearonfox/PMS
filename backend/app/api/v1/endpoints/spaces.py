from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.endpoints.auth import get_current_user
from app.db import get_db
from app.models.user import User
from app.repositories import db_store
from app.schemas.space import Space, SpaceCreate, SpaceMember, SpaceMemberCreate, SpaceMemberUpdate, SpaceUpdate

router = APIRouter(prefix="/spaces", tags=["spaces"])
SPACE_READ_ROLES = {"admin", "member", "viewer"}
SPACE_ADMIN_ROLES = {"admin"}


def require_space_role(db: Session, space_id: int, user_id: int, allowed_roles: set[str]) -> None:
    if db_store.get_space(db, space_id) is None:
        raise HTTPException(status_code=404, detail="Space not found")
    if not db_store.has_space_role(db, space_id, user_id, allowed_roles):
        raise HTTPException(status_code=403, detail="Not enough permissions")


@router.get("", response_model=list[Space])
def list_spaces(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Space]:
    return db_store.list_spaces(db, user_id=current_user.id)


@router.get("/{space_id}", response_model=Space)
def get_space(
    space_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Space:
    require_space_role(db, space_id, current_user.id, SPACE_READ_ROLES)
    space = db_store.get_space(db, space_id)
    if space is None:
        raise HTTPException(status_code=404, detail="Space not found")
    return space


@router.post("", response_model=Space, status_code=status.HTTP_201_CREATED)
def create_space(
    payload: SpaceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Space:
    space = db_store.create_space(db, payload, creator_id=current_user.id)
    if space is None:
        raise HTTPException(status_code=409, detail="Space already exists")
    return space


@router.patch("/{space_id}", response_model=Space)
def update_space(
    space_id: int,
    payload: SpaceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Space:
    require_space_role(db, space_id, current_user.id, SPACE_ADMIN_ROLES)
    try:
        space = db_store.update_space(db, space_id, payload, user_id=current_user.id)
    except db_store.DuplicateSpaceNameError:
        raise HTTPException(status_code=409, detail="Space already exists") from None

    if space is None:
        raise HTTPException(status_code=404, detail="Space not found")
    return space


@router.delete("/{space_id}")
def delete_space(
    space_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, bool]:
    require_space_role(db, space_id, current_user.id, SPACE_ADMIN_ROLES)
    deleted = db_store.delete_space(db, space_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Space not found")
    return {"deleted": True}


@router.get("/{space_id}/members", response_model=list[SpaceMember])
def list_space_members(
    space_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[SpaceMember]:
    require_space_role(db, space_id, current_user.id, SPACE_READ_ROLES)
    return db_store.list_space_members(db, space_id)


@router.post("/{space_id}/members", response_model=SpaceMember, status_code=status.HTTP_201_CREATED)
def add_space_member(
    space_id: int,
    payload: SpaceMemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SpaceMember:
    require_space_role(db, space_id, current_user.id, SPACE_ADMIN_ROLES)
    try:
        return db_store.add_space_member(db, space_id, payload)
    except db_store.SpaceMemberNotFoundError:
        raise HTTPException(status_code=404, detail="Space not found") from None
    except db_store.UserNotFoundError:
        raise HTTPException(status_code=404, detail="User not found") from None
    except db_store.SpaceMemberAlreadyExistsError:
        raise HTTPException(status_code=409, detail="User is already a member") from None


@router.patch("/{space_id}/members/{user_id}", response_model=SpaceMember)
def update_space_member(
    space_id: int,
    user_id: int,
    payload: SpaceMemberUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SpaceMember:
    require_space_role(db, space_id, current_user.id, SPACE_ADMIN_ROLES)
    try:
        return db_store.update_space_member(db, space_id, user_id, payload)
    except db_store.SpaceMemberNotFoundError:
        raise HTTPException(status_code=404, detail="Space member not found") from None
    except db_store.UserNotFoundError:
        raise HTTPException(status_code=404, detail="User not found") from None


@router.delete("/{space_id}/members/{user_id}")
def remove_space_member(
    space_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, bool]:
    require_space_role(db, space_id, current_user.id, SPACE_ADMIN_ROLES)
    deleted = db_store.remove_space_member(db, space_id, user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Space member not found")
    return {"deleted": True}
