PORT_MIN=8010
PORT_MAX=8099
flag=$1
name=$2
resource=$3
exp_port=$4
max_mem=$5
env_file_path=$6
volume_name="df-vol-$(echo "$name" | tr '.[:]/' '-')" 

available_ports=()

for ((port=PORT_MIN; port<=PORT_MAX; port++)); do
    if ! ss -ln src :$port | grep -q "\<$port\>"; then
        available_ports+=($port)
    fi
done

echo "Available ports: ${available_ports[56]}"
AVAILABLE=0
echo "Creating subdomain $name"

# Create volume if it doesn't exist
if ! docker volume inspect "$volume_name" >/dev/null 2>&1; then
    echo "Creating volume: $volume_name"
    docker volume create "$volume_name"
fi

git clone $resource $name

if [ -n "$env_file_path" ] && [ -f "$env_file_path" ]; then
    echo "Using runtime env file: $env_file_path"
else
    if [ -f ".env" ]; then
        sudo cp .env $name/
    fi
fi

cd $name

if [ $flag = "-g" ]; then
    sudo cp ../Dockerfile ./
elif [ $flag = "-s" ]; then
    sudo echo "
    FROM nginx:alpine
    COPY . /usr/share/nginx/html
    " > Dockerfile    
fi

sudo docker build -t $name .

docker_run_cmd="sudo docker run --memory=$max_mem --name=$name -d -p ${available_ports[$AVAILABLE]}:$exp_port -v $volume_name:/app/data"

if [ -n "$env_file_path" ] && [ -f "$env_file_path" ]; then
    sudo chmod 600 "$env_file_path"
    docker_run_cmd="$docker_run_cmd --env-file $env_file_path"
fi

docker_run_cmd="$docker_run_cmd $name"
eval $docker_run_cmd

if [ -n "$env_file_path" ] && [ -f "$env_file_path" ] && [[ "$env_file_path" == /tmp/* ]]; then
    sudo rm -f "$env_file_path"
fi

cd ..
sudo rm -rf $name
if [ -f "Dockerfile" ]; then
    sudo rm Dockerfile
fi
if [ -f ".env" ] && [ -z "$env_file_path" ]; then
    sudo rm .env
fi
sudo touch /etc/nginx/sites-available/$2.conf
sudo chmod 666 /etc/nginx/sites-available/$2.conf
sudo echo "# Virtual Host configuration for $2
    server {
    listen 80;
    listen [::]:80;
    listen 443 ssl;
    listen [::]:443 ssl;
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
    ssl_certificate /etc/letsencrypt/live/domains.mdgspace.org-0002/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/domains.mdgspace.org-0002/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    }" > /etc/nginx/sites-available/$2.conf
sudo ln -s /etc/nginx/sites-available/$2.conf /etc/nginx/sites-enabled/$2.conf
sudo systemctl reload nginx
