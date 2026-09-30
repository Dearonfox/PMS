from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select, update
from sqlalchemy.orm import Session, joinedload

from app.api.v1.endpoints.auth import get_current_user
from app.db import get_db
from app.models.board import Comment, Post
from app.models.user import User
from app.schemas.board import CommentInput, CommentRead, PostDetail, PostInput, PostPage, PostSummary

router = APIRouter(tags=["board"])


def require_post(db: Session, post_id: int, lock: bool = False) -> Post:
    statement = select(Post).where(Post.id == post_id)
    if lock:
        statement = statement.with_for_update()
    post = db.scalar(statement)
    if post is None:
        raise HTTPException(404, "게시글을 찾을 수 없습니다.")
    return post


def require_owner(author_id: int, user: User) -> None:
    if author_id != user.id:
        raise HTTPException(403, "작성자만 수정하거나 삭제할 수 있습니다.")


def detail(db: Session, post: Post) -> PostDetail:
    result = PostDetail.model_validate(post)
    result.comment_count = db.scalar(select(func.count()).select_from(Comment).where(Comment.post_id == post.id)) or 0
    return result


@router.get("/posts", response_model=PostPage)
def list_posts(page: int = Query(1, ge=1), size: int = Query(10, ge=1, le=100),
               search: str = Query("", max_length=200), db: Session = Depends(get_db)):
    filters = []
    if search.strip():
        filters.append(or_(Post.title.contains(search.strip(), autoescape=True),
                           Post.content.contains(search.strip(), autoescape=True)))
    total = db.scalar(select(func.count()).select_from(Post).where(*filters)) or 0
    counts = select(Comment.post_id, func.count().label("count")).group_by(Comment.post_id).subquery()
    rows = db.execute(select(Post, func.coalesce(counts.c.count, 0))
                      .outerjoin(counts, counts.c.post_id == Post.id).options(joinedload(Post.author))
                      .where(*filters).order_by(Post.created_at.desc(), Post.id.desc())
                      .offset((page - 1) * size).limit(size)).all()
    items = [PostSummary.model_validate(post).model_copy(update={"comment_count": count}) for post, count in rows]
    return PostPage(items=items, page=page, size=size, total=total, total_pages=(total + size - 1) // size)


@router.get("/posts/{post_id}", response_model=PostDetail)
def get_post(post_id: int, db: Session = Depends(get_db)):
    result = db.execute(update(Post).where(Post.id == post_id).values(view_count=Post.view_count + 1))
    if not result.rowcount:
        raise HTTPException(404, "게시글을 찾을 수 없습니다.")
    db.commit()
    return detail(db, require_post(db, post_id))


@router.post("/posts", response_model=PostDetail, status_code=201)
def create_post(payload: PostInput, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    post = Post(**payload.model_dump(), author_id=user.id)
    db.add(post)
    db.commit()
    return detail(db, post)


@router.put("/posts/{post_id}", response_model=PostDetail)
def update_post(post_id: int, payload: PostInput, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    post = require_post(db, post_id, lock=True)
    require_owner(post.author_id, user)
    post.title, post.content, post.updated_at = payload.title, payload.content, func.now()
    db.commit()
    return detail(db, post)


@router.delete("/posts/{post_id}")
def delete_post(post_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    post = require_post(db, post_id, lock=True)
    require_owner(post.author_id, user)
    db.delete(post)
    db.commit()
    return {"deleted": True}


@router.get("/posts/{post_id}/comments", response_model=list[CommentRead])
def list_comments(post_id: int, db: Session = Depends(get_db)):
    require_post(db, post_id)
    return db.scalars(select(Comment).options(joinedload(Comment.author)).where(Comment.post_id == post_id)
                      .order_by(Comment.created_at, Comment.id)).all()


@router.post("/posts/{post_id}/comments", response_model=CommentRead, status_code=201)
def create_comment(post_id: int, payload: CommentInput, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    require_post(db, post_id, lock=True)
    comment = Comment(post_id=post_id, author_id=user.id, content=payload.content)
    db.add(comment)
    db.commit()
    return comment


def owned_comment(db: Session, comment_id: int, user: User) -> Comment:
    comment = db.scalar(select(Comment).where(Comment.id == comment_id).with_for_update())
    if comment is None:
        raise HTTPException(404, "댓글을 찾을 수 없습니다.")
    require_owner(comment.author_id, user)
    return comment


@router.put("/comments/{comment_id}", response_model=CommentRead)
def update_comment(comment_id: int, payload: CommentInput, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    comment = owned_comment(db, comment_id, user)
    comment.content = payload.content
    db.commit()
    return comment


@router.delete("/comments/{comment_id}")
def delete_comment(comment_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.delete(owned_comment(db, comment_id, user))
    db.commit()
    return {"deleted": True}
