from typing import Literal

from pydantic import BaseModel, Field


TaskStatus = Literal["Todo", "In Progress", "Done"]


class TaskBase(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    project_id: int
    status: TaskStatus = "Todo"
    due: str | None = None
    assignee: str | None = None
    assignee_id: int | None = None
    description: str | None = None


class TaskCreate(TaskBase):
    creator_id: int | None = None


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=100)
    project_id: int | None = None
    status: TaskStatus | None = None
    due: str | None = None
    assignee: str | None = None
    assignee_id: int | None = None
    description: str | None = None


class Task(TaskBase):
    id: int
    creator_id: int
