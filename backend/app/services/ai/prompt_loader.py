from pathlib import Path
from functools import lru_cache

PROMPT_DIR = Path(__file__).resolve().parent / "prompts"


def load_prompt(filename: str) -> str:
    """
    Load a prompt template from the prompts/ directory.

    The path is resolved relative to this module file, so it works regardless
    of the current working directory (uvicorn, Celery, pytest all work correctly).

    Raises:
        FileNotFoundError: If the requested prompt file does not exist.
    """
    prompt_path = PROMPT_DIR / filename
    if not prompt_path.exists():
        raise FileNotFoundError(
            f"Prompt file not found: '{filename}'. "
            f"Expected at: {prompt_path}"
        )
    return prompt_path.read_text(encoding="utf-8")


@lru_cache(maxsize=None)
def load_prompt_cached(filename: str) -> str:
    """Cached version of load_prompt — reads each file only once per process."""
    return load_prompt(filename)


def render_prompt(template: str, **variables: str) -> str:
    """
    Replace {{PLACEHOLDER}} markers in a template with provided values.

    Only simple string substitution — no eval, no exec, no Jinja.

    Example:
        render_prompt(template, SCENE_TEXT="A sunset over the ocean.")
    """
    result = template
    for key, value in variables.items():
        result = result.replace(f"{{{{{key}}}}}", value)
    return result
