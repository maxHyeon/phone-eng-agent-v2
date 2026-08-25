#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_PID_FILE="$ROOT/.backend.pid"
FRONTEND_PID_FILE="$ROOT/.frontend.pid"
LOG_DIR="$ROOT/logs"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[run]${NC} $*"; }
warn() { echo -e "${YELLOW}[run]${NC} $*"; }
err()  { echo -e "${RED}[run]${NC} $*" >&2; }

mkdir -p "$LOG_DIR"

# --- helpers ---

_is_running() {
  local pid_file="$1"
  if [[ -f "$pid_file" ]]; then
    local pid
    pid=$(cat "$pid_file")
    if kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
    rm -f "$pid_file"
  fi
  return 1
}

_start_backend() {
  if _is_running "$BACKEND_PID_FILE"; then
    warn "Backend already running (pid $(cat "$BACKEND_PID_FILE"))"
    return
  fi
  local logfile="$LOG_DIR/backend.log"
  log "Starting backend → http://localhost:8000  (log: logs/backend.log)"
  cd "$ROOT/backend"
  nohup .venv/bin/python main.py >> "$logfile" 2>&1 &
  echo $! > "$BACKEND_PID_FILE"
  cd "$ROOT"
}

_start_frontend() {
  if _is_running "$FRONTEND_PID_FILE"; then
    warn "Frontend already running (pid $(cat "$FRONTEND_PID_FILE"))"
    return
  fi
  local logfile="$LOG_DIR/frontend.log"
  log "Starting frontend → http://localhost:5173  (log: logs/frontend.log)"
  cd "$ROOT/frontend"
  nohup npm run dev >> "$logfile" 2>&1 &
  echo $! > "$FRONTEND_PID_FILE"
  cd "$ROOT"
}

_stop_backend() {
  if _is_running "$BACKEND_PID_FILE"; then
    local pid
    pid=$(cat "$BACKEND_PID_FILE")
    log "Stopping backend (pid $pid)"
    kill "$pid" 2>/dev/null || true
    rm -f "$BACKEND_PID_FILE"
  else
    warn "Backend is not running"
  fi
}

_stop_frontend() {
  if _is_running "$FRONTEND_PID_FILE"; then
    local pid
    pid=$(cat "$FRONTEND_PID_FILE")
    log "Stopping frontend (pid $pid)"
    kill "$pid" 2>/dev/null || true
    rm -f "$FRONTEND_PID_FILE"
  else
    warn "Frontend is not running"
  fi
}

# --- commands ---

cmd_start() {
  _start_backend
  _start_frontend
  log "Both services started in background."
}

cmd_stop() {
  _stop_backend
  _stop_frontend
  log "All services stopped."
}

cmd_restart() {
  local target="${1:-all}"
  case "$target" in
    backend)
      _stop_backend
      sleep 1
      _start_backend
      ;;
    frontend)
      _stop_frontend
      sleep 1
      _start_frontend
      ;;
    all)
      cmd_stop
      sleep 1
      cmd_start
      ;;
    *)
      err "Unknown target: $target (use backend, frontend, or all)"
      exit 1
      ;;
  esac
}

cmd_status() {
  if _is_running "$BACKEND_PID_FILE"; then
    log "Backend:  running (pid $(cat "$BACKEND_PID_FILE"))"
  else
    warn "Backend:  stopped"
  fi
  if _is_running "$FRONTEND_PID_FILE"; then
    log "Frontend: running (pid $(cat "$FRONTEND_PID_FILE"))"
  else
    warn "Frontend: stopped"
  fi
}

cmd_logs() {
  local target="${1:-all}"
  case "$target" in
    backend)
      tail -f "$LOG_DIR/backend.log"
      ;;
    frontend)
      tail -f "$LOG_DIR/frontend.log"
      ;;
    all)
      tail -f "$LOG_DIR/backend.log" "$LOG_DIR/frontend.log"
      ;;
    *)
      err "Unknown target: $target (use backend, frontend, or all)"
      exit 1
      ;;
  esac
}

cmd_help() {
  cat <<EOF
Usage: ./run.sh <command> [target]

Commands:
  start               Start backend + frontend (background)
  stop                Stop all services
  restart [target]    Restart services (target: backend, frontend, all)
  status              Show running status
  logs [target]       Tail logs (target: backend, frontend, all)
  help                Show this help

Examples:
  ./run.sh start              # Start both in background
  ./run.sh restart backend    # Restart backend only
  ./run.sh logs backend       # Tail backend log
  ./run.sh stop               # Stop all
EOF
}

# --- main ---

case "${1:-help}" in
  start)   cmd_start ;;
  stop)    cmd_stop ;;
  restart) cmd_restart "${2:-all}" ;;
  status)  cmd_status ;;
  logs)    cmd_logs "${2:-all}" ;;
  help|*)  cmd_help ;;
esac
