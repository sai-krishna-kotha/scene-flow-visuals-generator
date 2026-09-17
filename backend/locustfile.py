from locust import HttpUser, task

class RenderTest(HttpUser):
    @task
    def hit_endpoint(self):
        self.client.get("/projects/")