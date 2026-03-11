PORT_MIN=8010
PORT_MAX=8099
flag=$1
name=$2
resource=$3
exp_port=$4
max_mem=$5 

available_ports=()

for ((port=PORT_MIN; port<=PORT_MAX; port++)); do
    if ! ss -ln src :$port | grep -q "\<$port\>"; then
        available_ports+=($port)
    fi
done

echo "Available ports: ${available_ports[56]}"
AVAILABLE=0
echo "Creating subdomain $name"
git clone $resource $name
sudo cp .env $name/
cd $name

if [ $flag = "-g" ]; then
    sudo cp ../Dockerfile ./
    sudo cp ../.dockerignore ./ 2>/dev/null || true
elif [ $flag = "-s" ]; then
    sudo echo "
    FROM nginx:alpine
    COPY . /usr/share/nginx/html
    " > Dockerfile    
fi

sudo docker build -t $name .
sudo docker run --memory=$max_mem --name=$name -d -p ${available_ports[$AVAILABLE]}:$exp_port $name
cd ..
sudo rm -rf $name
sudo rm Dockerfile
sudo rm .env
sudo touch /etc/nginx/sites-available/$name.conf
sudo chmod 666 /etc/nginx/sites-available/$name.conf
sudo echo "# Virtual Host configuration for $name
    server {
    listen 80;
    listen [::]:80;
    server_name $name;
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
    }" > /etc/nginx/sites-available/$name.conf
sudo ln -s /etc/nginx/sites-available/$name.conf /etc/nginx/sites-enabled/$name.conf
sudo systemctl reload nginx
