class DomainError(Exception):
    """Base class for domain-specific exceptions."""
    pass

class ScenesAlreadyExistError(DomainError):
    """Raised when attempting to segment a script that already has scenes."""
    def __init__(self, script_id: str):
        self.script_id = script_id
        super().__init__(f"Scenes already exist for script {script_id}.")

class GeminiError(DomainError):
    """Raised when the Gemini API fails or returns an error."""
    pass

class EmptyScriptError(DomainError):
    """Raised when attempting to segment a script with no content."""
    pass

class SegmentationError(DomainError):
    """Raised when the segmentation output is invalid or missing."""
    pass
