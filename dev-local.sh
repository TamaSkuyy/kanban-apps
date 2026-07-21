#!/usr/bin/env bash
# =============================================================================
# Kanban Apps — Local Development Launcher
# =============================================================================
# Usage:  ./dev-local.sh [--setup] [--no-backend|--no-frontend|--no-db]
#
# What it does:
#   1. Checks prerequisites (docker, go, node, npm)
#   2. Copies .env.example → .env if not present
#   3. Starts PostgreSQL in Docker
#   4. Runs database migrations
#   5. Starts Go backend with air (hot reload) — or plain go run
#   6. Starts Next.js frontend dev server
#   7. Waits for Ctrl+C then cleans up
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
SETUP=false
NO_DB=false
NO_BACKEND=false
NO_FRONTEND=false

for arg in "$@"; do
  case "$arg" in
    --setup)       SETUP=true ;;
    --no-db)       NO_DB=true ;;
    --no-backend)  NO_BACKEND=true ;;
    --no-frontend) NO_FRONTEND=true ;;
    -h|--help)
      echo "Usage: ./dev-local.sh [--setup] [--no-db|--no-backend|--no-frontend]"
      echo "  --setup        First-time: install air, npm install"
      echo "  --no-db        Skip PostgreSQL container"
      echo "  --no-backend   Skip backend server"
      echo "  --no-frontend  Skip frontend server"
      exit 0
      ;;
  esac
done

# ── Trap cleanup ─────────────────────────────────────────────────────────────
PIDS=()
cleanup() {
  echo ""
  warn "Shutting down..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  log "All services stopped."
}
trap cleanup SIGINT SIGTERM

# ── Step 1: Check prerequisites ──────────────────────────────────────────────
step "Checking prerequisites"

MISSING=()
if [ "$NO_DB" = false ];     then command -v docker &>/dev/null || { err "docker required"; MISSING+=("docker"); }; fi
if [ "$NO_BACKEND" = false ]; then command -v go     &>/dev/null || { err "go required";     MISSING+=("go");     }; fi
if [ "$NO_FRONTEND" = false ];then command -v node   &>/dev/null || { err "node required";   MISSING+=("node");   }; fi
if [ "$NO_FRONTEND" = false ];then command -v npm    &>/dev/null || { err "npm required";    MISSING+=("npm");    }; fi

if [ ${#MISSING[@]} -gt 0 ]; then
  err "Missing: ${MISSING[*]}. Install them first."
  exit 1
fi
log "Prerequisites OK"

# ── Step 2: Setup (first-time) ───────────────────────────────────────────────
step "Setup"

if [ ! -f .env ]; then
  cp .env.example .env
  log "Created .env from .env.example"
else
  log ".env exists"
fi

# Source env vars
set -a; source .env; set +a

POSTGRES_USER="${POSTGRES_USER:-kanban}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-kanban}"
POSTGRES_DB="${POSTGRES_DB:-kanban}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

if [ "$SETUP" = true ]; then
  log "First-time setup..."

  if ! command -v air &>/dev/null && [ "$NO_BACKEND" = false ]; then
    log "Installing air (Go hot reload)..."
    go install github.com/air-verse/air@latest
  fi

  if [ "$NO_FRONTEND" = false ]; then
    log "Installing frontend dependencies..."
    (cd frontend && npm install)
  fi

  log "Setup complete. Run: ./dev-local.sh"
  exit 0
fi

# ── Step 3: Start PostgreSQL ─────────────────────────────────────────────────
if [ "$NO_DB" = false ]; then
  step "Starting PostgreSQL"

  docker compose up -d postgres 2>&1 | sed 's/^/  /'

  log "Waiting for PostgreSQL..."
  for i in $(seq 1 30); do
    if docker compose exec -T postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" &>/dev/null; then
      log "PostgreSQL ready (port $POSTGRES_PORT)"
      break
    fi
    if [ "$i" -eq 30 ]; then err "PostgreSQL timeout"; exit 1; fi
    sleep 1
  done

  # ── Step 4: Run migrations ─────────────────────────────────────────────────
  step "Running database migrations"

  for migration in backend/migrations/*.up.sql; do
    name=$(basename "$migration")
    log "Applying: $name"
    docker compose exec -T postgres \
      psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$migration" 2>&1 || warn "$name may already be applied"
  done
  log "Migrations complete"
fi

# Hard-override DATABASE_URL for local dev (ignore .env placeholder)
export DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}?sslmode=disable"

# ── Step 5: Start Backend ────────────────────────────────────────────────────
if [ "$NO_BACKEND" = false ]; then
  step "Starting Go backend"

  if command -v air &>/dev/null; then
    log "Backend: air (hot reload) → http://localhost:8080"
    (cd backend && air) &
    PIDS+=($!)
  else
    warn "air not found — falling back to go run (no hot reload)"
    warn "Run: ./dev-local.sh --setup"
    (cd backend && go run .) &
    PIDS+=($!)
  fi
fi

# ── Step 6: Start Frontend ───────────────────────────────────────────────────
if [ "$NO_FRONTEND" = false ]; then
  step "Starting Next.js frontend"

  if [ ! -d frontend/node_modules ]; then
    warn "Installing frontend dependencies..."
    (cd frontend && npm install)
  fi

  log "Frontend: next dev → http://localhost:3000"
  (cd frontend && npm run dev) &
  PIDS+=($!)
fi

# ── Step 7: Ready ────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          All services running!                       ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║${NC}  Frontend : ${CYAN}http://localhost:3000${NC}                          ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  Backend  : ${CYAN}http://localhost:8080${NC}                          ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  Health   : ${CYAN}http://localhost:8080/api/health${NC}               ${GREEN}║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║${NC}  Press ${RED}Ctrl+C${NC} to stop all services                  ${GREEN}║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

wait
