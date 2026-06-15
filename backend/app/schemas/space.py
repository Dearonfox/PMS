from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


SpaceMemberRole = Literal["admin", "member", "viewer"]


class SpaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None


class SpaceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None


class Space(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None = None
    creator_id: int


class SpaceMemberCreate(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    role: SpaceMemberRole = "member"


class SpaceMemberUpdate(BaseModel):
    role: SpaceMemberRole


class SpaceMember(BaseModel):
    space_id: int
    user_id: int
    email: str
    display_name: str
    role: SpaceMemberRole
