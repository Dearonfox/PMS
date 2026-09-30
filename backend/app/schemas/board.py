from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints

Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Body = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=10000)]
CommentBody = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]


class PostInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: Title
    content: Body


class CommentInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    content: CommentBody


class Author(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    display_name: str


class PostSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    author: Author
    view_count: int
    created_at: datetime
    updated_at: datetime
    comment_count: int = 0


class PostDetail(PostSummary):
    content: str


class PostPage(BaseModel):
    items: list[PostSummary]
    page: int
    size: int
    total: int
    total_pages: int


class CommentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    post_id: int
    content: str
    author: Author
    created_at: datetime
    updated_at: datetime
