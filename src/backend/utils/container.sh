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
PORT_MIN=8000
PORT_MAX=8099
suffix=$(echo $RANDOM | md5sum | head -c 20)

flag=$1
name=$2-$suffix
resource=$3
env=$4 

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
    if [ -f "$name/docker-compose.yml" ]; then
        echo "docker-compose.yml exists in $name"
    elif [ -f "$name/Dockerfile" ]; then
        echo "Dockerfile exists in $name"
        sudo docker build -t $name $name
        sudo docker stop test-img
        sudo docker rm test-img
        sudo docker run -d --name test-img $name
        test=$(sudo docker exec -it test-img lsof -i -P -n | grep LISTEN | awk -F'[:(]' '{print $2}')
        sudo docker stop test-img
        sudo docker run -d --name $name -p ${available_ports[$AVAILABLE]}:$test $name
        echo "Container $name running on port $AVAILABLE"
        test=$(sudo docker exec -it test-img lsof -i -P -n | grep LISTEN | awk -F'[:(]' '{print $2}')
    else
        sudo pack build $name --path $name --builder paketobuildpacks/builder-jammy-full 
        echo "Port ${available_ports[$AVAILABLE]} is available";
        sudo docker stop test-img
        sudo docker rm test-img
        sudo docker run -d --name test-img $name
        test=$(sudo docker exec -it test-img lsof -i -P -n | grep LISTEN | grep IPv6 | awk -F'[:(]' '{print $2}')
        sudo docker stop test-img
        sudo docker run -d --name $name -p ${available_ports[$AVAILABLE]}:$test $name
        echo "Container $name running on port ${available_ports[$AVAILABLE]}"
        AVAILABLE+=1
    fi
    rm -rf $name
    bash ./automate.sh -p ${available_ports[$AVAILABLE]} $2
fi