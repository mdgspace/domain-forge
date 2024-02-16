PORT_MIN=8010
PORT_MAX=8099
flag=$1
name=$2
resource=$3
exp_port=$4 

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
    sudo cp Dockerfile $name/
    sudo cp .env $name/
    cd $name
    sudo docker build -t $name .
    echo ${available_ports[$AVAILABLE]};
    sudo docker run -d -p ${available_ports[$AVAILABLE]}:$exp_port $2
    cd ..
    sudo rm -rf $name
    sudo rm Dockerfile
    sudo rm .env

    sudo touch /etc/nginx/sites-available/$2.conf
    sudo chmod 666 /etc/nginx/sites-available/$2.conf
    sudo echo "# Virtual Host configuration for example.com
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
    ssl_certificate /etc/letsencrypt/live/df.mdgspace.org-0001/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/df.mdgspace.org-0001/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    }" > /etc/nginx/sites-available/$2.conf
    sudo ln -s /etc/nginx/sites-available/$2.conf /etc/nginx/sites-enabled/$2.conf
    sudo systemctl reload nginx

else
    git clone $resource $name
    sudo cp .env $name/
    cd $name
    sudo echo "
    FROM nginx:alpine
    COPY . /usr/share/nginx/html
    " > Dockerfile
    sudo docker build -t $name .
    sudo docker run -d -p ${available_ports[$AVAILABLE]}:80 $name
    cd ..
    sudo rm .env
    sudo rm -rf $name
    sudo touch /etc/nginx/sites-available/$2.conf
    sudo chmod 666 /etc/nginx/sites-available/$2.conf
    sudo echo "# Virtual Host configuration for example.com
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
     ssl_certificate /etc/letsencrypt/live/df.mdgspace.org-0001/fullchain.pem;
     ssl_certificate_key /etc/letsencrypt/live/df.mdgspace.org-0001/privkey.pem;
     include /etc/letsencrypt/options-ssl-nginx.conf;
     ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
     }" > /etc/nginx/sites-available/$2.conf;
     sudo ln -s /etc/nginx/sites-available/$2.conf /etc/nginx/sites-enabled/$2.conf;
     sudo systemctl reload nginx;
fi



