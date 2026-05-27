# Cyxcel Seeding

This project provide API for the Cyxcel platform using Prisma and TypeScript. 

# Setup

## Prerequisites

- Docker
- Docker Compose
- Docker proxy  (e.g., `nginx-proxy`)
- Docker Network `docker-proxy-overlay`. Ensure that network exists

### 1) Create environment files

Copy the example files and adjust values as needed:

```bash
cp .env.example .env
cp .env.loc.example .env.loc
```
Edit `.env` and `.env.loc` using the provided example (DB/Redis settings).


### 2) Build and start
```bash
docker compose build
docker compose up -d
```

### 3) Run database migrations (one-time or after model changes)
```bash
docker compose run --rm cyxcel-migrations
```

### 4) Access
- App: `http://cyxcel.ns/`

### Stop services
```bash
docker compose down
```

For detailed configuration and troubleshooting, see `core/README.md`.

### API documentation UI

http://cyxcel.ns/api/docs

### API documentation JSON

http://cyxcel.ns/api/docs-json

