report_error() {
  local msg="$1"
  local sub="$2"
  curl -X POST -H "Content-Type: application/json" \
       -d "{\"subdomain\": \"$sub\", \"status\": \"failed\", \"logs\": \"$msg\"}" \
       http://localhost:$BACKEND_PORT/maplogs
}

report_success() {
  local sub="$1"
  curl -X POST -H "Content-Type: application/json" \
       -d "{\"subdomain\": \"$sub\", \"status\": \"success\", \"logs\": \"Build completed successfully\"}" \
       http://localhost:$BACKEND_PORT/maplogs
}

PORT_MIN=8010
PORT_MAX=8099
flag=$1
name=$2
resource=$3
exp_port=$4
max_mem=$5 
BACKEND_PORT=$6

available_ports=()

for ((port=PORT_MIN; port<=PORT_MAX; port++)); do
    if ! ss -ln src :$port | grep -q "\<$port\>"; then
        available_ports+=($port)
    fi
done

echo "Available ports: ${available_ports[56]}"
AVAILABLE=0
echo "Creating subdomain $name"
if ! git clone $resource $name; then
    report_error "Git clone failed for repository $resource" "$name"
    exit 1
fi
sudo cp .env $name/
cd $name

if [ $flag = "-g" ]; then
    sudo cp ../Dockerfile ./
elif [ $flag = "-s" ]; then
    sudo echo "
    FROM nginx:alpine
    COPY . /usr/share/nginx/html
    " > Dockerfile    
fi

if ! sudo docker build -t $name .; then
    report_error "Docker build failed. Please check your Dockerfile or dependency configurations." "$name"
    exit 1
fi
if ! sudo docker run --memory=$max_mem --name=$name -d -p ${available_ports[$AVAILABLE]}:$exp_port $name; then
     report_error "Docker run failed. Container could not start." "$name"
     exit 1
fi
cd ..
sudo rm -rf $name
sudo rm Dockerfile
sudo rm .env
sudo touch /etc/nginx/sites-available/$2.conf
sudo chmod 666 /etc/nginx/sites-available/$2.conf
sudo echo "# Virtual Host configuration for $2
    server {
    listen 80;
    listen [::]:80;
    server_name $2;
    location / {
        proxy_pass http://localhost:${available_ports[$AVAILABLE]};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
    charset utf-8;
    client_max_body_size 20M;
    }" > /etc/nginx/sites-available/$2.conf
sudo ln -s /etc/nginx/sites-available/$2.conf /etc/nginx/sites-enabled/$2.conf
sudo systemctl reload nginx

report_success "$name"