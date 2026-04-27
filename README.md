# AI App

AI conversation workspace with a Next.js frontend and a FastAPI + LangGraph backend.

## Docker Compose deployment

The repository includes a root `docker-compose.yml` that starts the full local stack:

- `web`: Next.js frontend on `http://localhost:3000`
- `api`: FastAPI backend on `http://localhost:8010`
- `mongo`: MongoDB for conversation history and Agent state
- `postgres`: PostgreSQL with pgvector support for user data and vector retrieval

Before starting, fill the root `.env` values, especially `DEEPSEEK_API_KEY`.

```powershell
docker compose up --build
```

Useful checks:

```powershell
docker compose ps
Invoke-RestMethod http://localhost:8010/api/health
```

Stop the stack:

```powershell
docker compose down
```

Remove database volumes when you want a clean local reset:

```powershell
docker compose down -v
```
