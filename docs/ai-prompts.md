# AI Prompts — Architecture and Management

## Why prompts are externalized

Prompt text is the primary control surface for AI model behavior. Storing prompts as inline Python f-strings has several drawbacks:

- **Readability**: Multi-line strings are harder to read, edit, and review.
- **Version control**: Changes to prompt wording are visible as diff noise inside Python files that also contain logic.
- **Responsibility separation**: Prompt wording is a content/editorial concern; Python files should contain business logic.
- **Prompt iteration**: Non-engineers (e.g., content specialists, AI red-teamers) should be able to improve prompt wording without navigating Python code.
- **Testability**: External files can be loaded and inspected independently.

Externalizing prompts to version-controlled Markdown files solves all of these.

---

## Prompt file locations

```
backend/app/services/ai/
├── prompt_loader.py           ← Loader utility
└── prompts/
    ├── scene_analysis.md      ← Per-scene visual intelligence extraction
    └── script_segmentation.md ← Full script → discrete scenes
```

---

## Runtime placeholder substitution

Prompt files use `{{PLACEHOLDER}}` markers for runtime values:

| File | Placeholder | Injected value |
|---|---|---|
| `scene_analysis.md` | `{{SCENE_TEXT}}` | The raw scene text from the database |
| `script_segmentation.md` | `{{SCRIPT_TEXT}}` | The full script `full_text` field |

The substitution is performed by `render_prompt()` in `prompt_loader.py` using simple `str.replace()` — no `eval`, no `exec`, no Jinja2 templating engine.

```python
prompt = render_prompt(load_prompt_cached("scene_analysis.md"), SCENE_TEXT=scene_text)
```

---

## Prompt responsibilities

### `scene_analysis.md` — Scene Visual Intelligence

**Used by:** `GeminiSceneAnalyzer.analyze_scene()`  
**Input:** A single scene's text  
**Output schema:** `SceneAnalysis` (Pydantic)

Instructs Gemini to act as SceneFlow — an expert visual director — and extract:
- `summary` — what a camera would see
- `subjects` — specific visual subjects
- `actions` — visible actions
- `environment` — physical location and setting
- `mood` — visual atmosphere
- `time_context` — time of day / temporal context
- `visual_queries` — stock search queries (3–8, concrete, usable)

Key constraints in the prompt:
- Do NOT invent details not in the scene text
- Do NOT search the internet
- Use concrete visual language
- Stock queries must be immediately usable

---

### `script_segmentation.md` — Script → Scenes

**Used by:** `GeminiScriptSegmenter.segment_script()`  
**Input:** A full script's text  
**Output schema:** `ScriptSegmentation` (Pydantic, list of `SceneSegment`)

Instructs Gemini to divide a full script into discrete visual scenes, producing for each:
- `order` — integer, original story order
- `title` — short descriptive scene title (3–8 words)
- `scene_text` — verbatim scene text from the source script

Key constraints in the prompt:
- Split only on meaningful changes: location, time, action, narrative beat
- Do NOT create one scene per sentence
- Preserve all story content verbatim
- Do NOT invent events or dialogue
- Return only the structured JSON

---

## Prompt versioning

Prompt files are versioned by Git. Every change to a prompt file appears as a diff in the repository history, allowing:
- Rollback to any previous prompt version
- Attribution of who changed what
- Comparison of prompt versions alongside result quality

Each prompt file includes a header comment:
```
# Prompt version: v1
```

This is a human-readable marker. It is NOT stored in the database and NOT exposed to users. Increment it manually when making significant prompt changes to make the git history readable.

---

## How to modify prompts safely

1. Edit the `.md` file in `backend/app/services/ai/prompts/`.
2. Keep `{{SCENE_TEXT}}` or `{{SCRIPT_TEXT}}` exactly as-is — these are runtime injection points.
3. Do not add new `{{PLACEHOLDER}}` markers unless you also update `render_prompt()` calls in the corresponding service.
4. Run the test suite:
   ```bash
   cd backend
   .\venv\Scripts\pytest.exe tests/test_prompt_loader.py tests/test_gemini_service.py tests/test_gemini_script_segmenter.py -v
   ```
5. Optionally run a real Gemini smoke test against the development database.
6. Commit the prompt change with a clear message:
   ```
   prompt: improve scene_analysis visual query instructions
   ```

---

## Security rules

Prompt files must **never** contain:
- API keys or access tokens
- Database credentials
- User secrets or PII
- Environment-specific configuration

The only runtime-injected values are user-provided content (scene text, script text), which is treated as untrusted string input and inserted via simple replacement — not executed.

---

## Prompt loading implementation

`prompt_loader.py` provides:

| Function | Purpose |
|---|---|
| `load_prompt(filename)` | Load a prompt file fresh each call. Raises `FileNotFoundError` clearly if missing. |
| `load_prompt_cached(filename)` | LRU-cached version — reads each file once per process lifetime. |
| `render_prompt(template, **vars)` | Replace `{{KEY}}` markers. Safe, deterministic, no template engine. |

The prompt directory is resolved using:
```python
PROMPT_DIR = Path(__file__).resolve().parent / "prompts"
```

This works correctly regardless of where the process was started (uvicorn, Celery, pytest).
