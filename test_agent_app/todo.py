class TodoApp:
    def __init__(self):
        self.tasks = []

    def add_task(self, task):
        if not task:
            raise ValueError("Task cannot be empty")
        self.tasks.append({"task": task, "completed": False})
        return True

    def complete_task(self, index):
        if index < 0 or index >= len(self.tasks):
            raise IndexError("Task index out of range")
        self.tasks[index]["completed"] = True
        return True

    def get_tasks(self):
        return self.tasks

    def remove_task(self, index):
        if index < 0 or index >= len(self.tasks):
            raise IndexError("Task index out of range")
        return self.tasks.pop(index)

if __name__ == "__main__":
    app = TodoApp()
    app.add_task("Test the CI Repair Agent")
    app.complete_task(0)
    print("Current tasks:", app.get_tasks())
