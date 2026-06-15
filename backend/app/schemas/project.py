from pydantic import BaseModel, ConfigDict, Field


class ProjectCreate(BaseModel):
    space_id: int | None = None
    name: str = Field(min_length=1, max_length=100)
    emoji: str | None = Field(default=None, max_length=20)
    description: str | None = None


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    emoji: str | None = Field(default=None, max_length=20)
    description: str | None = None


class Project(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    space_id: int
    name: str
    emoji: str | None = None
    description: str | None = None
