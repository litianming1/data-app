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
- `POST /api/chat` — non-streaming chat response with multi-turn context
- `POST /api/chat/stream` — SSE streaming response with multi-turn context

Both chat endpoints support `conversation_id`. If omitted, the server creates a
new conversation and returns the generated ID. Send the same `conversation_id`
on later requests to include recent MongoDB-backed conversation history in the
model context.

Streaming events:

- `conversation` — `{ "conversation_id": "..." }`
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
