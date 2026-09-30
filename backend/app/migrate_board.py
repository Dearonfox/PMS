"""Add board tables without modifying existing tables or seeding users.

Run from backend: python -m app.migrate_board
Uses reflected users.id so SQL-schema-created BIGINT installations also work.
"""
from sqlalchemy import MetaData, Table

from app.db import engine
from app.models.board import Comment, Post


def migrate_board() -> None:
    metadata = MetaData()
    users = Table("users", metadata, autoload_with=engine)
    posts = Post.__table__.to_metadata(metadata)
    comments = Comment.__table__.to_metadata(metadata)
    posts.c.author_id.type = users.c.id.type.copy()
    comments.c.author_id.type = users.c.id.type.copy()
    metadata.create_all(engine, tables=[posts, comments], checkfirst=True)


if __name__ == "__main__":
    migrate_board()
    print("Board migration completed.")
