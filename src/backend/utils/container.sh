
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
PORT_MIN=8000;
PORT_MAX=9999;
suffix=$(echo $RANDOM | md5sum | head -c 20)

flag=$1
name=$2-$suffix
resource=$3
# env=$4 
if [ $flag = "-g" ]; then
    git clone $resource $name
    sudo pack build $name --path $name --builder paketobuildpacks/builder-jammy-full 
    AVAILABLE=$PORT_MIN
    while [ $AVAILABLE -lt $PORT_MAX ]; do
        result=$(ss -ln src :$AVAILABLE | grep -Ec -e "\<$AVAILABLE\>")
        if [ "$result" -eq 0 ]; then
            echo "Port $AVAILABLE is available";
            sudo docker stop test-img
            sudo docker rm test-img
            sudo docker run -d --name test-img test
            test=$(sudo docker exec -it test-img lsof -i -P -n | grep LISTEN | awk -F'[:(]' '{print $2}')
            sudo docker stop test-img
            sudo docker run -d --name $name -p $AVAILABLE:$test $name
            echo "Container $name running on port $AVAILABLE"
            break
        fi        
        AVAILABLE=$((AVAILABLE+1))
    done
    rm -rf $name
fi