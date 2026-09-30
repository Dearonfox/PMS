import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.db import Base
from app.models.project import Project
from app.models.space import Space, SpaceMember
from app.models.task import Task
from app.models.user import User
from app.repositories import db_store


class SpaceListPermissionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)

        with Session(self.engine) as db:
            first_user = User(
                email="first@example.com",
                display_name="First",
                auth_provider="local",
                provider_user_id="first@example.com",
            )
            second_user = User(
                email="second@example.com",
                display_name="Second",
                auth_provider="local",
                provider_user_id="second@example.com",
            )
            db.add_all([first_user, second_user])
            db.flush()

            first_space = Space(name="First space", creator_id=first_user.id)
            second_space = Space(name="Second space", creator_id=second_user.id)
            db.add_all([first_space, second_space])
            db.flush()
            db.add_all(
                [
                    SpaceMember(space_id=first_space.id, user_id=first_user.id, role="admin"),
                    SpaceMember(space_id=second_space.id, user_id=second_user.id, role="admin"),
                ]
            )

            first_project = Project(
                space_id=first_space.id,
                name="First project",
                creator_id=first_user.id,
            )
            second_project = Project(
                space_id=second_space.id,
                name="Second project",
                creator_id=second_user.id,
            )
            db.add_all([first_project, second_project])
            db.flush()
            db.add_all(
                [
                    Task(project_id=first_project.id, title="First task", creator_id=first_user.id),
                    Task(project_id=second_project.id, title="Second task", creator_id=second_user.id),
                ]
            )
            db.commit()

            self.first_user_id = first_user.id
            self.second_user_id = second_user.id
            self.first_space_id = first_space.id
            self.second_space_id = second_space.id

    def tearDown(self) -> None:
        self.engine.dispose()

    def test_unfiltered_lists_only_include_users_spaces(self) -> None:
        with Session(self.engine) as db:
            first_projects = db_store.list_projects(db, user_id=self.first_user_id)
            first_tasks = db_store.list_tasks(db, user_id=self.first_user_id)
            second_projects = db_store.list_projects(db, user_id=self.second_user_id)
            second_tasks = db_store.list_tasks(db, user_id=self.second_user_id)

        self.assertEqual([project.name for project in first_projects], ["First project"])
        self.assertEqual([task.title for task in first_tasks], ["First task"])
        self.assertEqual([project.name for project in second_projects], ["Second project"])
        self.assertEqual([task.title for task in second_tasks], ["Second task"])

    def test_filters_cannot_cross_space_membership(self) -> None:
        with Session(self.engine) as db:
            projects = db_store.list_projects(
                db,
                user_id=self.first_user_id,
                space_id=self.second_space_id,
            )
            tasks = db_store.list_tasks(
                db,
                user_id=self.first_user_id,
                space_id=self.second_space_id,
            )

        self.assertEqual(projects, [])
        self.assertEqual(tasks, [])


if __name__ == "__main__":
    unittest.main()
