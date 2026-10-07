#!/bin/bash
# Hardened Domain Forge host pipe listener (P1-6 Remediation)
set -eo pipefail

PIPE_FILE="$(dirname "$0")/pipe"
SCRIPT_DIR="$(cd "$(dirname "$0")/../../src/backend/shell_scripts" 2>/dev/null && pwd)"

# Ensure FIFO pipe exists with secure permissions
[ -p "$PIPE_FILE" ] || { rm -f "$PIPE_FILE"; mkfifo "$PIPE_FILE"; chmod 600 "$PIPE_FILE"; }

while true; do
  if read -r line < "$PIPE_FILE"; then
    [ -z "$line" ] && continue
    # Extract arguments safely without arbitrary eval
    read -r -a args <<< "$line"

    # Check if first arg is 'bash' or 'sh'
    if [ "${args[0]:-}" = "bash" ] || [ "${args[0]:-}" = "sh" ]; then
      script_path="${args[1]:-}"
      shift_count=2
    else
      script_path="${args[0]:-}"
      shift_count=1
    fi

    # Validate that script_path basename is in allowed whitelist
    script_name="$(basename "$script_path")"
    case "$script_name" in
      "container.sh"|"restart.sh"|"stop.sh"|"delete.sh"|"automate.sh")
        script_full_path="$SCRIPT_DIR/$script_name"
        if [ -f "$script_full_path" ]; then
          bash "$script_full_path" "${args[@]:$shift_count}" || true
        else
          echo "[listen.sh] Target script not found: $script_full_path" >&2
        fi
        ;;
      *)
        echo "[listen.sh] Blocked execution of disallowed command: $line" >&2
        ;;
    esac
  fi
done
