from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Space(Base):
    __tablename__ = "spaces"
    __table_args__ = (
        UniqueConstraint("creator_id", "name", name="uq_spaces_creator_name"),
        CheckConstraint("status in ('active', 'archived')", name="ck_spaces_status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    creator_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active", server_default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class SpaceMember(Base):
    __tablename__ = "space_members"
    __table_args__ = (
        CheckConstraint("role in ('admin', 'member', 'viewer')", name="ck_space_members_role"),
    )

    space_id: Mapped[int] = mapped_column(ForeignKey("spaces.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="member", server_default="member")
    joined_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
