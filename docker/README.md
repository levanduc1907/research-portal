# Docker Infrastructure for UIUC Research Portal

This directory contains the Docker configuration and build files for local infrastructure services.

## Services Overview

| Service | Technology | Port | Purpose / Dashboard |
| --- | --- | --- | --- |
| `mysql` | MySQL 8.4 (Custom Build) | `3306` | Primary database (`uiuc_research`) |
| `redis` | Redis 7 Alpine | `6379` | Queue (BullMQ) & caching |
| `qdrant` | Qdrant Vector DB | `6333`, `6334` | Vector search & Web UI (`http://localhost:6333/dashboard`) |
| `adminer` | Adminer Web GUI | `8080` | MySQL database management (`http://localhost:8080`) |
| `redis-commander` | Redis Commander | `8082` | Redis queue inspector (`http://localhost:8082`) |

---

## Directory Structure

```text
docker/
├── Dockerfile           # Custom MySQL Dockerfile (charset, tuning, healthcheck)
├── my.cnf               # MySQL server configuration (utf8mb4, innodb tuning)
├── init/
│   └── 01-init.sql      # Database initialization script
├── docker-compose.yml   # Multi-service compose definition
└── README.md            # This documentation
```

---

## Quick Start Commands

From the monorepo root:

### 1. Build the MySQL Database Image
```bash
# Build custom MySQL image
pnpm docker:build

# Or directly with docker compose:
docker compose -f docker/docker-compose.yml build mysql
```

### 2. Start Services in Background
```bash
pnpm docker:up

# Or with docker compose:
docker compose -f docker/docker-compose.yml up -d
```

### 3. Check Service Status & Logs
```bash
# View live logs
pnpm docker:logs

# Check container status
docker compose -f docker/docker-compose.yml ps
```

### 4. Stop Services
```bash
pnpm docker:down

# Or to stop and remove volumes (clean database reset):
docker compose -f docker/docker-compose.yml down -v
```

---

## Database Connection Details

- **Host**: `localhost`
- **Port**: `3306`
- **Database**: `uiuc_research`
- **User**: `uiuc_user`
- **Password**: `uiuc_password`
- **Root Password**: `root_password`
- **Prisma Connection String**:
  ```env
  DATABASE_URL="mysql://uiuc_user:uiuc_password@localhost:3306/uiuc_research"
  ```
