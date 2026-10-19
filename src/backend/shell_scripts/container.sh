#!/bin/bash
PORT_MIN=8010
PORT_MAX=8099
flag=$1
name=$2
resource=$3
exp_port=$4
max_mem=$5 
author=${6:-"anonymous"}

# Logging and Status tracking setup
# Use absolute paths to avoid issues when the script cd's into subdirectories
SCRIPT_CWD="$(pwd)"
LOG_DIR="$SCRIPT_CWD/logs"
STATUS_DIR="$SCRIPT_CWD/status"
mkdir -p "$LOG_DIR" "$STATUS_DIR"
LOG_FILE="$LOG_DIR/$name.log"
STATUS_FILE="$STATUS_DIR/$name.status"

# Redirect all output to log file and update status
# We use tee to still see logs in the console
exec > >(tee -a "$LOG_FILE") 2>&1

echo "DEPLOYING" > "$STATUS_FILE"

# Trap errors to mark status as FAILED and clean up temporary files (P2-5 Remediation)
cleanup_temp_files() {
    sudo rm -f "$SCRIPT_CWD/.env.$name" "$SCRIPT_CWD/Dockerfile.$name" "$SCRIPT_CWD/.dockerignore.$name" 2>/dev/null || true
    sudo rm -rf "$SCRIPT_CWD/$name" 2>/dev/null || true
}

error_handler() {
    echo "FAILED" > "$STATUS_FILE"
    cleanup_temp_files
    # A failed deploy must not leave its nginx conf behind: it would keep
    # pointing at a port that a future deploy can recycle. But if a container
    # with this name is still running (a failed redeploy that died before the
    # container swap, or a conf/reload failure after a successful run), the
    # existing conf is still correct — keep it.
    if ps_out="$(sudo docker ps --format '{{.Names}}' 2>/dev/null)"; then
        if ! printf '%s\n' "$ps_out" | grep -Fxq -- "$name"; then
            sudo rm -f "/etc/nginx/sites-available/$name.conf" "/etc/nginx/sites-enabled/$name.conf" 2>/dev/null || true
            # Take the removal live at once instead of leaving a stale
            # in-memory route until the next deploy's reload; harmless if
            # nothing changed (no-op reload).
            if sudo nginx -t >/dev/null 2>&1; then
                sudo systemctl reload nginx 2>/dev/null || true
            fi
        fi
    else
        echo "WARN: docker ps failed; keeping nginx confs for $name" >&2
    fi
    exit 1
}
trap 'error_handler' ERR

# Find the first free port in range (only one is ever needed)
available_port=""

for ((port=PORT_MIN; port<=PORT_MAX; port++)); do
    if ! ss -lnt "sport = :$port" | grep -q "\<$port\>"; then
        available_port=$port
        break
    fi
done

if [ -z "$available_port" ]; then
    echo "ERROR: No available ports in range $PORT_MIN-$PORT_MAX" >&2
    exit 1
fi

echo "Using free port: $available_port"
echo "Creating subdomain $name"
git clone $resource $name
# Check for subdomain-specific .env file
if [ -f ".env.$name" ]; then
    sudo cp ".env.$name" "$name/.env"
fi
cd $name

if [ $flag = "-g" ]; then
    sudo cp "../Dockerfile.$name" ./Dockerfile
    sudo cp "../.dockerignore.$name" ./.dockerignore 2>/dev/null || true
elif [ $flag = "-s" ]; then
    sudo echo "
    FROM nginx:alpine
    COPY . /usr/share/nginx/html
    " > Dockerfile    
fi

sudo docker build -t $name .

# ---- Port translation -------------------------------------------------------
# The deployer's Port field is advisory; the image is the source of truth for
# which port the app actually listens on. If the typed port is not among the
# TCP ports the image declares (EXPOSE), publish to the image's declared port
# instead — e.g. user types 8084 but the app serves on 80.
# Inspect the IMAGE (not "$name", which may still resolve to the previous
# container on a redeploy) and tolerate missing images via || true.
declared="$(sudo docker image inspect --format '{{range $p, $_ := .Config.ExposedPorts}}{{$p}} {{end}}' "$name" 2>/dev/null || true)"
tcp_ports="$(echo "$declared" | tr -s ' ' '\n' | sed -n 's|/tcp$||p')"
if [ -n "$tcp_ports" ] && ! printf '%s\n' "$tcp_ports" | grep -Fxq -- "$exp_port"; then
    translated="$(printf '%s\n' "$tcp_ports" | sort -n | head -1)"
    echo "NOTE: requested port ${exp_port} is not declared by the image (declares: ${declared})."
    if [ "$(printf '%s\n' "$tcp_ports" | wc -l)" -gt 1 ]; then
        echo "WARN: image declares several TCP ports; chose the lowest one. Verify the site serves the app."
    fi
    echo "      Publishing to container port ${translated} instead."
    exp_port="$translated"
fi
# -----------------------------------------------------------------------------

# Safety net: If the frontend sends double requests from spam-clicking, forcefully remove any zombie container holding the name
sudo docker rm -f $name 2>/dev/null || true

LABEL_ARGS="--label df_subdomain=$name"
if [ -n "$author" ]; then
    LABEL_ARGS="$LABEL_ARGS --label df_author=$author"
fi

sudo docker run $LABEL_ARGS --memory=$max_mem --name=$name -d -p 127.0.0.1:${available_port}:$exp_port $name
cd ..
cleanup_temp_files

sudo touch /etc/nginx/sites-available/$name.conf
sudo chmod 644 /etc/nginx/sites-available/$name.conf
echo "# Virtual Host configuration for $name
    server {
    listen 80;
    listen [::]:80;
    server_name $name;
    location / {
        proxy_pass http://localhost:${available_port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
    charset utf-8;
    client_max_body_size 20M;
    }" | sudo tee /etc/nginx/sites-available/$name.conf > /dev/null
sudo ln -sf /etc/nginx/sites-available/$name.conf /etc/nginx/sites-enabled/$name.conf
sudo systemctl reload nginx

echo "READY" > "$STATUS_FILE"
