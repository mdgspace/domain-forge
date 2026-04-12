#!/bin/bash
# deploy-wrapper.sh — Shared logging helper for deployment scripts.
# Sources this at the top of container.sh / automate.sh to get:
#   - Standardized log file setup
#   - Output capture (stdout + stderr → log file)
#   - Status marker writing on exit

# Usage (from another script):
#   DEPLOY_SUBDOMAIN="myapp"
#   source "$(dirname "$0")/deploy-wrapper.sh"
#   # ... do work ...
#   # On exit, status marker is written automatically via trap.

set -o pipefail

DEPLOY_LOG_DIR="/hostpipe/logs"
mkdir -p "$DEPLOY_LOG_DIR"

# Guard: DEPLOY_SUBDOMAIN must be set by the caller before sourcing this file.
if [ -z "$DEPLOY_SUBDOMAIN" ]; then
    echo "[deploy-wrapper] ERROR: DEPLOY_SUBDOMAIN is not set" >&2
    exit 1
fi

DEPLOY_LOG_FILE="$DEPLOY_LOG_DIR/${DEPLOY_SUBDOMAIN}.log"

# Truncate any previous log for this subdomain (we keep only the latest).
> "$DEPLOY_LOG_FILE"

# Redirect stdout and stderr to both the terminal and the log file.
exec > >(tee -a "$DEPLOY_LOG_FILE") 2>&1

echo "###DEPLOY_START:$(date -u +%Y-%m-%dT%H:%M:%SZ)###"

# Trap to write a status marker on script exit.
# The exit code of the last command determines SUCCESS vs FAILED.
_deploy_wrapper_exit_handler() {
    local exit_code=$?
    if [ $exit_code -eq 0 ]; then
        echo "###STATUS:SUCCESS###"
    else
        echo "###STATUS:FAILED:${exit_code}###"
    fi
    echo "###DEPLOY_END:$(date -u +%Y-%m-%dT%H:%M:%SZ)###"
}
trap _deploy_wrapper_exit_handler EXIT
