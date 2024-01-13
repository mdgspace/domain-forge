#!/bin/bash
if ! command -v git >/dev/null 2>&1; then
    echo "Git is not installed. Exiting."
    exit 1
fi
if ! command -v pack >/dev/null 2>&1; then
    echo "Buildpack cli not installed. Exiting."
    exit 1
fi
if ! command -v docker >/dev/null 2>&1; then
    echo "docker not installed. Exiting"
    exit 1
fi
PORT_MIN=8010
PORT_MAX=8099
suffix=$(echo $RANDOM | md5sum | head -c 20)
host="mdgiitr"
http_upgrade="mdgiitr"
flag=$1
name=$2-$suffix
env_content=$3
resource=$4
dockerfile=$5 
exp_port=$6

available_ports=()

for ((port=PORT_MIN; port<=PORT_MAX; port++)); do
    if ! ss -ln src :$port | grep -q "\<$port\>"; then
        available_ports+=($port)
    fi
done

echo "Available ports: ${available_ports[56]}"
AVAILABLE=0
if [ $flag = "-g" ]; then
    git clone $resource $name
    cd $name
    touch .env
    echo "$env_content" > .env
    touch Dockerfile
    echo "
    $dockerfile
    " > Dockerfile
    sudo docker build -t $name .
    echo $port
    sudo docker run -d -p ${available_ports[$AVAILABLE]}:$exp_port $name
    cd ..
    rm -rf $name
    sudo touch /etc/nginx/sites-available/$2.conf
    sudo chmod 666 /etc/nginx/sites-available/$2.conf
    sudo echo "# Virtual Host configuration for example.com
  server {
     listen 80;
     listen [::]:80;
     server_name $2;
     location / {
        proxy_pass http://localhost:${available_ports[$AVAILABLE]};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
     }
     }" > /etc/nginx/sites-available/$2.conf;
     sudo ln -s /etc/nginx/sites-available/$2.conf /etc/nginx/sites-enabled/$2.conf;
     sudo systemctl reload nginx;
    
else
    git clone $resource $name
    cd $name
    touch Dockerfile
    echo "
    FROM nginx:alpine
    COPY . /usr/share/nginx/html
    " > Dockerfile
    sudo docker build -t $name .
    sudo docker run -d -p ${available_ports[$AVAILABLE]}:80 $name
    cd ..
    rm -rf $name
    sudo touch /etc/nginx/sites-available/$2.conf
    sudo chmod 666 /etc/nginx/sites-available/$2.conf
    sudo echo "# Virtual Host configuration for example.com
  server {
     listen 80;
     listen [::]:80;
     server_name $2;
     location / {
        proxy_pass http://localhost:${available_ports[$AVAILABLE]};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
     }
     }" > /etc/nginx/sites-available/$2.conf;
     sudo ln -s /etc/nginx/sites-available/$2.conf /etc/nginx/sites-enabled/$2.conf;
     sudo systemctl reload nginx;
fi


