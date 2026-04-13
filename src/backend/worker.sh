#!/bin/bash

# A native Bash worker to listen to the Redis queue and process deployments.
# Requirements: 'jq' must be installed (e.g. `sudo apt install jq`)

echo "[Worker] Starting Native Bash Redis Queue Worker..."

if ! command -v jq &> /dev/null; then
    echo "Error: 'jq' is not installed. Please install jq (e.g., sudo apt install jq) on the host machine to parse JSON payloads."
    exit 1
fi

WORK_DIR_BASE="/tmp/domain-forge-work"
mkdir -p "$WORK_DIR_BASE"

# Get absolute path to the shell scripts directory (assuming this script is in src/backend/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/shell_scripts" && pwd)"

while true; do
    echo "[Worker] Waiting for messages on 'jobs:deployments'..."
    
    # We use 'docker exec' to use the redis-cli inside the redis container!
    # This means you don't even need redis-cli installed on the host machine.
    # --raw removes the prompt decorators.
    RAW_OUTPUT=$(docker exec df_redis redis-cli --raw BRPOP jobs:deployments 0 2>/dev/null)
    
    if [ $? -ne 0 ]; then
        echo "[Worker] Failed to reach Redis. Retrying in 2 seconds..."
        sleep 2
        continue
    fi

    # BRPOP raw output puts the key on line 1, and the payload on line 2+
    PAYLOAD=$(echo "$RAW_OUTPUT" | sed '1d')

    if [ -z "$PAYLOAD" ]; then
        continue
    fi

    echo "[Worker] Process Job payload received."

    # Parse JSON variables using jq
    ACTION=$(echo "$PAYLOAD" | jq -r '.action // empty')
    SUBDOMAIN=$(echo "$PAYLOAD" | jq -r '.subdomain // empty')
    
    SAFE_SUBDOMAIN=$(echo "$SUBDOMAIN" | tr -cd 'a-zA-Z0-9-')
    if [ -z "$SAFE_SUBDOMAIN" ]; then
        echo "[Worker] Error: Invalid or missing subdomain. Skipping job."
        continue
    fi

    JOB_DIR="$WORK_DIR_BASE/${SAFE_SUBDOMAIN}-$(date +%s)"
    mkdir -p "$JOB_DIR"

    # Extract files gracefully, outputting raw strings
    echo "$PAYLOAD" | jq -r '.dockerfileContent // empty' > "$JOB_DIR/Dockerfile"
    echo "$PAYLOAD" | jq -r '.dockerignoreContent // empty' > "$JOB_DIR/.dockerignore"
    echo "$PAYLOAD" | jq -r '.envContent // empty' > "$JOB_DIR/.env"

    # Remove empty files if jq yielded nothing
    [ ! -s "$JOB_DIR/Dockerfile" ] && rm -f "$JOB_DIR/Dockerfile"
    [ ! -s "$JOB_DIR/.dockerignore" ] && rm -f "$JOB_DIR/.dockerignore"
    [ ! -s "$JOB_DIR/.env" ] && rm -f "$JOB_DIR/.env"

    RESOURCE_TYPE=$(echo "$PAYLOAD" | jq -r '.resourceType // empty')
    RESOURCE=$(echo "$PAYLOAD" | jq -r '.resource // empty')
    PORT=$(echo "$PAYLOAD" | jq -r '.port // empty')
    MEM_LIMIT=$(echo "$PAYLOAD" | jq -r '.memLimit // empty')
    STATIC_CONTENT=$(echo "$PAYLOAD" | jq -r '.staticContent // empty')
    DOCKERFILE_PRESENT=$(echo "$PAYLOAD" | jq -r '.dockerfilePresent // empty')

    # Execute scripts inside the isolated job directory
    (
        cd "$JOB_DIR" || exit 1
        
        case "$ACTION" in
            "create")
                if [ "$RESOURCE_TYPE" == "URL" ]; then
                    bash "$SCRIPT_DIR/automate.sh" -u "$RESOURCE" "$SAFE_SUBDOMAIN"
                elif [ "$RESOURCE_TYPE" == "PORT" ]; then
                    bash "$SCRIPT_DIR/automate.sh" -p "$RESOURCE" "$SAFE_SUBDOMAIN"
                elif [ "$RESOURCE_TYPE" == "GITHUB" ] && [ "$STATIC_CONTENT" == "Yes" ]; then
                    bash "$SCRIPT_DIR/container.sh" -s "$SAFE_SUBDOMAIN" "$RESOURCE" 80 "${MEM_LIMIT:-512m}"
                elif [ "$RESOURCE_TYPE" == "GITHUB" ] && [ "$STATIC_CONTENT" == "No" ]; then
                    if [ "$DOCKERFILE_PRESENT" == "No" ]; then
                        bash "$SCRIPT_DIR/container.sh" -g "$SAFE_SUBDOMAIN" "$RESOURCE" "${PORT:-80}" "${MEM_LIMIT:-512m}"
                    elif [ "$DOCKERFILE_PRESENT" == "Yes" ]; then
                        bash "$SCRIPT_DIR/container.sh" -d "$SAFE_SUBDOMAIN" "$RESOURCE" "${PORT:-80}" "${MEM_LIMIT:-512m}"
                    fi
                fi
                ;;
            "delete")
                bash "$SCRIPT_DIR/delete.sh" "$SAFE_SUBDOMAIN"
                ;;
            "restart")
                bash "$SCRIPT_DIR/restart.sh" "$SAFE_SUBDOMAIN"
                ;;
            "stop")
                bash "$SCRIPT_DIR/stop.sh" "$SAFE_SUBDOMAIN"
                ;;
            *)
                echo "[Worker] Unknown action: $ACTION"
                ;;
        esac
    )
done
