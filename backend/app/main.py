from fastapi import FastAPI
from pydantic import BaseModel
from fastapi import HTTPException


class TaskCreate(BaseModel):
    title : str
    description: str | None = None

class TaskUpdate(BaseModel):
    title: str |None = None
    description : str | None =None


tasks: list[dict] = []
app = FastAPI()

@app.get("/")
def read_root():
    return{"hello" : "FastAPI"}

@app.get("/health")
def health():
    return { "ok" : True}

@app.get("/tasks")
def list_tasks():
    return tasks

@app.get("/tasks/{task_id}")
def get_task(task_id: int):
    for t in tasks:
        if t["id"] == task_id:
            return t
    raise HTTPException(status_code=404, detail = "Task not found")

@app.post("/tasks")
def create_task(body : TaskCreate):
    task = { "id" : len(tasks) +1, "title" : body.title, "description" : body.description}
    tasks.append(task)
    return task

@app.patch("/tasks/{task_id}")
def update_task(task_id: int, body : TaskUpdate):
    for t in tasks:
        if t["id"] ==task_id:
            if body.title is not None:
                t["title"]= body.title
            if body.description is not None:
                t["description"] = body.description
            return t
    raise HTTPException(status_code= 404, detail= "Task not found")

@app.delete("/tasks/{task_id}")
def delete_task(task_id: int):
    for i, t in enumerate(tasks):
        if t["id"] == task_id:
            tasks.pop(i)
            return {"deleted": True}
    raise HTTPException(status_code =404, detail = "task not found" )
