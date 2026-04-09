import pytest
from fastapi.testclient import TestClient
from app import app, db

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_db():
    # Clear the database before each test
    db.clear()
    import app as my_app
    my_app.current_id = 1
    yield

def test_read_main():
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]

def test_add_task():
    response = client.post("/api/tasks", json={"title": "Fix the pipeline"})
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Fix the pipeline"
    assert data["id"] == 1
    assert data["completed"] is False

def test_get_tasks():
    client.post("/api/tasks", json={"title": "Task 1"})
    client.post("/api/tasks", json={"title": "Task 2"})
    response = client.get("/api/tasks")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["title"] == "Task 1"

def test_update_task():
    post_res = client.post("/api/tasks", json={"title": "Incomplete task"})
    task_id = post_res.json()["id"]
    
    put_res = client.put(f"/api/tasks/{task_id}", json={"completed": True})
    assert put_res.status_code == 200
    assert put_res.json()["completed"] is True

def test_delete_task():
    post_res = client.post("/api/tasks", json={"title": "To be deleted"})
    task_id = post_res.json()["id"]
    
    del_res = client.delete(f"/api/tasks/{task_id}")
    assert del_res.status_code == 200
    
    get_res = client.get(f"/api/tasks/{task_id}")
    assert get_res.status_code == 405  # GET not allowed on specific task unless defined, wait, we don't have GET /api/tasks/{id}
    
    tasks_res = client.get("/api/tasks")
    assert len(tasks_res.json()) == 0

def test_invalid_task():
    response = client.post("/api/tasks", json={"title": "   "})
    assert response.status_code == 400
