import pytest
from todo import TodoApp

def test_add_task():
    app = TodoApp()
    app.add_task("Buy milk")
    tasks = app.get_tasks()
    assert len(tasks) == 1
    assert tasks[0]["task"] == "Buy milk"
    assert not tasks[0]["completed"]

def test_complete_task():
    app = TodoApp()
    app.add_task("Write code")
    app.complete_task(0)
    assert app.get_tasks()[0]["completed"] == True

def test_add_empty_task():
    app = TodoApp()
    with pytest.raises(ValueError):
        app.add_task("")

def test_remove_task():
    app = TodoApp()
    app.add_task("Task 1")
    app.add_task("Task 2")
    removed = app.remove_task(0)
    assert removed["task"] == "Task 1"
    assert len(app.get_tasks()) == 1

def test_index_out_of_range():
    app = TodoApp()
    with pytest.raises(IndexError):
        app.complete_task(0)
