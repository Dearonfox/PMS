from uuid import uuid4

from app.schemas.project import Project
from app.schemas.task import Task, TaskCreate, TaskUpdate


class MemoryStore:
    def __init__(self) -> None:
        self._projects: list[Project] = [
            Project(id="p1", name="PMS Core", emoji="[CORE]"),
            Project(id="p2", name="UI Bench", emoji="[UI]"),
            Project(id="p3", name="DB Design", emoji="[DB]"),
        ]
        self._tasks: list[Task] = [
            Task(
                id="t1",
                title="Define project and task structure",
                project_id="p3",
                status="Todo",
                due="Today",
                assignee="Min",
                description="Document the first project/task relationship.",
            ),
            Task(
                id="t2",
                title="Build Asana-style sidebar",
                project_id="p2",
                status="In Progress",
                due="Tomorrow",
                assignee="Jin",
                description="Create the first navigation shell for the PMS.",
            ),
            Task(
                id="t3",
                title="Finish Firebase login flow",
                project_id="p1",
                status="Done",
                assignee="Alex",
                description="Confirm email login and Google login both work.",
            ),
        ]

    def list_projects(self) -> list[Project]:
        return self._projects

    def get_project(self, project_id: str) -> Project | None:
        return next((project for project in self._projects if project.id == project_id), None)

    def list_tasks(self, project_id: str | None = None) -> list[Task]:
        if project_id is None:
            return self._tasks
        return [task for task in self._tasks if task.project_id == project_id]

    def get_task(self, task_id: str) -> Task | None:
        return next((task for task in self._tasks if task.id == task_id), None)

    def create_task(self, payload: TaskCreate) -> Task:
        task = Task(id=f"t-{uuid4().hex[:8]}", **payload.model_dump())
        self._tasks.append(task)
        return task

    def update_task(self, task_id: str, payload: TaskUpdate) -> Task | None:
        task = self.get_task(task_id)
        if task is None:
            return None

        updates = payload.model_dump(exclude_unset=True)
        updated_task = task.model_copy(update=updates)

        self._tasks = [updated_task if item.id == task_id else item for item in self._tasks]
        return updated_task

    def delete_task(self, task_id: str) -> bool:
        before = len(self._tasks)
        self._tasks = [task for task in self._tasks if task.id != task_id]
        return len(self._tasks) < before

memory_store = MemoryStore()
