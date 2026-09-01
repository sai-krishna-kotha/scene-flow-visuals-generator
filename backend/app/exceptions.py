class AppError(Exception):
    """Base application exception."""
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)

class NotFoundError(AppError):
    """Base exception for resources not found."""
    pass

class ProjectNotFoundError(NotFoundError):
    def __init__(self, message: str = "Project not found"):
        super().__init__(message)

class ScriptNotFoundError(NotFoundError):
    def __init__(self, message: str = "Script not found"):
        super().__init__(message)

class SceneNotFoundError(NotFoundError):
    def __init__(self, message: str = "Scene not found"):
        super().__init__(message)
