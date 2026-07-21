#!/usr/bin/env bash
# =============================================================================
# Kanban Apps — Production Deployment
# =============================================================================
# Usage:  ./deploy-production.sh [--env .env.prod] [--skip-build] [--dry-run]
#
# What it does:
#   1. Validates environment & prerequisites
#   2. Builds Go backend binary (Docker multi-stage)
#   3. Builds Next.js frontend Docker image
#   4. Runs database migrations
#   5. Starts all services via docker compose
#   6. Performs health checks
# =============================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

# ── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'

log()  { echo -e "${GREEN}[INFO]${NC}  $(date '+%H:%M:%S')  $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $(date '+%H:%M:%S')  $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $(date '+%H:%M:%S')  $*"; }
step() { echo -e "\n${CYAN}═══ $* ═══${NC}"; }

# ── Flags ────────────────────────────────────────────────────────────────────
ENV_FILE=".env"
SKIP_BUILD=false
DRY_RUN=false
TAG="${TAG:-latest}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)        ENV_FILE="$2"; shift 2 ;;
    --skip-build) SKIP_BUILD=true; shift ;;
    --dry-run)    DRY_RUN=true; shift ;;
    --tag)        TAG="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: ./deploy-production.sh [--env .env.prod] [--skip-build] [--dry-run] [--tag v1]"
      echo ""
      echo "  --env <path>    Env file (default: .env)"
      echo "  --skip-build    Skip image build"
      echo "  --dry-run       Validate only, don't deploy"
      echo "  --tag <tag>     Docker image tag (default: latest)"
      echo ""
      echo "Required env vars in your env file:"
      echo "  POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB"
      echo "  DATABASE_URL, JWT_SECRET, NEXT_PUBLIC_API_URL"
      exit 0
      ;;
    *) shift ;;
  esac
done

# ── Step 1: Validate environment ─────────────────────────────────────────────
step "Validating environment"

if [ ! -f "$ENV_FILE" ]; then
  err "Env file '$ENV_FILE' not found."
  echo "  cp .env.example $ENV_FILE"
  echo "  Fill in production values, especially JWT_SECRET"
  exit 1
fi

set -a; source "$ENV_FILE"; set +a

MISSING_VARS=()
for var in POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB DATABASE_URL JWT_SECRET NEXT_PUBLIC_API_URL; do
  [ -z "${!var:-}" ] && MISSING_VARS+=("$var")
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  err "Missing env vars: ${MISSING_VARS[*]}"
  exit 1
fi

if [ "${#JWT_SECRET}" -lt 16 ]; then
  warn "JWT_SECRET < 16 chars — generate: openssl rand -hex 32"
fi

log "Environment OK"

# ── Step 2: Check prerequisites ──────────────────────────────────────────────
step "Checking prerequisites"

command -v docker &>/dev/null || { err "docker required"; exit 1; }
log "docker OK"

if [ "$SKIP_BUILD" = false ]; then
  command -v node &>/dev/null || { err "node required for frontend build"; exit 1; }
  command -v npm  &>/dev/null || { err "npm required for frontend build";  exit 1; }
  log "node + npm OK"
fi

# ── Step 3: Build Frontend Docker image ──────────────────────────────────────
if [ "$SKIP_BUILD" = false ]; then
  step "Building Frontend Docker image"

  # Create frontend Dockerfile if it doesn't exist
  if [ ! -f frontend/Dockerfile ]; then
    log "Creating frontend/Dockerfile..."
    cat > frontend/Dockerfile << 'DOCKERFILE'
# ── Build stage ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Run stage ────────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
USER app
EXPOSE 3000
CMD ["npm", "start"]
DOCKERFILE
  fi

  docker build -t "kanban-frontend:$TAG" -f frontend/Dockerfile frontend/
  log "Frontend image: kanban-frontend:$TAG"

  # ── Step 4: Build Backend Docker image ─────────────────────────────────────
  step "Building Backend Docker image"

  docker build -t "kanban-backend:$TAG" -f backend/Dockerfile backend/
  log "Backend image: kanban-backend:$TAG"
else
  log "Skipping builds (--skip-build)"
fi

# ── Step 5: Create production compose file ───────────────────────────────────
step "Preparing docker-compose.prod.yml"

PROD_COMPOSE="docker-compose.prod.yml"

cat > "$PROD_COMPOSE" << COMPOSE
# Production compose for Kanban Apps
# Generated: $(date '+%Y-%m-%d %H:%M:%S')
# Image tag: $TAG

services:
  postgres:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: \${POSTGRES_USER}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
      POSTGRES_DB: \${POSTGRES_DB}
    ports:
      - "\${POSTGRES_PORT:-5432}:5432"
    volumes:
      - postgres_prod_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \${POSTGRES_USER} -d \${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    image: kanban-backend:${TAG}
    restart: unless-stopped
    environment:
      DATABASE_URL: \${DATABASE_URL}
      JWT_SECRET: \${JWT_SECRET}
      BACKEND_ADDR: \${BACKEND_ADDR:-:8080}
      FRONTEND_ORIGIN: \${FRONTEND_ORIGIN:-http://localhost:3000}
    ports:
      - "\${BACKEND_PORT:-8080}:8080"
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:8080/api/health || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 3

  frontend:
    image: kanban-frontend:${TAG}
    restart: unless-stopped
    environment:
      NEXT_PUBLIC_API_URL: \${NEXT_PUBLIC_API_URL}
    ports:
      - "\${FRONTEND_PORT:-3000}:3000"
    depends_on:
      backend:
        condition: service_healthy

volumes:
  postgres_prod_data:
COMPOSE

log "$PROD_COMPOSE ready"

# ── Step 6: Run migrations ───────────────────────────────────────────────────
step "Running migrations"

if [ "$DRY_RUN" = false ]; then
  # Ensure postgres is up
  docker compose -f "$PROD_COMPOSE" up -d postgres 2>&1 | sed 's/^/  /'
  log "Waiting for PostgreSQL..."
  sleep 5

  for migration in backend/migrations/*.up.sql; do
    log "Applying: $(basename "$migration")"
    docker compose -f "$PROD_COMPOSE" exec -T postgres \
      psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" < "$migration" 2>&1 \
      || warn "May already be applied: $(basename "$migration")"
  done
  log "Migrations complete"
else
  log "DRY RUN: would run migrations"
fi

# ── Step 7: Deploy all services ──────────────────────────────────────────────
step "Deploying"

if [ "$DRY_RUN" = false ]; then
  docker compose -f "$PROD_COMPOSE" up -d --remove-orphans 2>&1 | sed 's/^/  /'
  log "Services starting..."
  sleep 8

  # ── Step 8: Health checks ──────────────────────────────────────────────────
  step "Health checks"

  BACKEND_PORT="${BACKEND_PORT:-8080}"
  FRONTEND_PORT="${FRONTEND_PORT:-3000}"

  if curl -sf "http://localhost:$BACKEND_PORT/api/health" &>/dev/null; then
    log "Backend   ✅ http://localhost:$BACKEND_PORT/api/health"
  else
    warn "Backend   ❌ check: docker compose -f $PROD_COMPOSE logs backend"
  fi

  if curl -sf -o /dev/null "http://localhost:$FRONTEND_PORT" 2>/dev/null; then
    log "Frontend  ✅ http://localhost:$FRONTEND_PORT"
  else
    warn "Frontend  ❌ check: docker compose -f $PROD_COMPOSE logs frontend"
  fi

  echo ""
  echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║          Deploy complete!                            ║${NC}"
  echo -e "${GREEN}╠══════════════════════════════════════════════════════╣${NC}"
  echo -e "${GREEN}║${NC}  Frontend : ${CYAN}http://localhost:$FRONTEND_PORT${NC}                    ${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}  Backend  : ${CYAN}http://localhost:$BACKEND_PORT${NC}                    ${GREEN}║${NC}"
  echo -e "${GREEN}╠══════════════════════════════════════════════════════╣${NC}"
  echo -e "${GREEN}║${NC}  Logs     : docker compose -f $PROD_COMPOSE logs -f ${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}  Stop     : docker compose -f $PROD_COMPOSE down    ${GREEN}║${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
  echo ""
else
  log "DRY RUN: would run: docker compose -f $PROD_COMPOSE up -d"
  warn "DRY RUN complete. Run without --dry-run to deploy."
fi
