# AI App Server

FastAPI backend for the AI conversation workspace.

## Stack

- **API layer**: FastAPI
- **Agent orchestration**: LangGraph
- **Model provider**: DeepSeek, via OpenAI-compatible chat API
- **Conversation / agent state**: MongoDB
- **User data / vector retrieval**: PostgreSQL + pgvector-ready storage

## Local setup

This backend uses `uv` for Python package and environment management.

1. Install `uv` if it is not already available.
2. Fill the repository root `.env` values, especially `DEEPSEEK_API_KEY`.
3. Start MongoDB and PostgreSQL locally, or update the connection strings.
4. Sync dependencies and run the API from the `server` folder.

```powershell
uv sync
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Common commands:

```powershell
uv add fastapi
uv remove fastapi
uv lock
uv run python -m compileall app
```

## Docker Compose

From the repository root, run the full stack with frontend, backend, MongoDB,
and PostgreSQL + pgvector:

```powershell
docker compose up --build
```

The API is exposed at `http://localhost:8010` in Compose mode.

## API

- `GET /api/health`
- `POST /api/chat` — non-streaming chat response with multi-turn context and automatic Skills triggering
- `POST /api/chat/stream` — SSE streaming response with multi-turn context and automatic Skills triggering
- `POST /api/markitdown` — convert an uploaded file to Markdown with MarkItDown
- `GET /api/conversations` — list recent conversation summaries, newest first
- `GET /api/conversations/{conversation_id}` — get recent messages for one conversation
- `GET /api/skills` — list MongoDB-backed Skills
- `POST /api/skills` — create a Skill
- `PATCH /api/skills/{skill_id}` — update a Skill
- `DELETE /api/skills/{skill_id}` — delete a Skill

Both chat endpoints support `conversation_id`. If omitted, the server creates a
new conversation and returns the generated ID. Send the same `conversation_id`
on later requests to include recent MongoDB-backed conversation history in the
model context.

`POST /api/markitdown` accepts `multipart/form-data` with a `file` field and
returns JSON containing the original filename, content type, and converted
Markdown text. Uploaded files are written only to temporary storage during
conversion and are not persisted by the API.

Conversation history endpoints are read-only. `GET /api/conversations` returns
recent MongoDB-backed conversation summaries, ordered by last update time. The
optional `limit` query parameter defaults to 20 and is capped at 100.
`GET /api/conversations/{conversation_id}` returns the stored recent messages
for that conversation, or `404` if the conversation does not exist. Deleting,
renaming, searching, and pinning conversations are intentionally out of scope
for this endpoint set.

Before generation, chat endpoints read enabled Skills from MongoDB and match the
current user message against each Skill's trigger, name, and description. Matched
Skill instructions are injected into the model system prompt for the current
turn only.

Streaming events:

- `conversation` — `{ "conversation_id": "..." }`
- `skills` — `{ "skills": [{ "id": "...", "name": "...", "category": "...", "trigger": "..." }] }`
- `delta` — `{ "text": "..." }`
- `done` — `{}`
- `error` — `{ "message": "..." }`

Example body:

```json
{
  "message": "总结 React 19 的开发注意点",
  "conversation_id": "optional-id",
  "mode": "fast"
}
```

Skills are stored in the MongoDB `skills` collection. On first startup, the
server seeds a default Skill library so the frontend `/skills` page has usable
data immediately.
