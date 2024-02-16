# Installation

### 1. Clone the Repository

Run the following command on your server to clone the repository.
```bash
    git clone https://github.com/mdgspace/domain-forge.git
```

### 2. Configuring the Environment Variables

This step involves the configuration of three `.env` files:
- Docker env:   
    As suggested in the `.env.sample` present at the `docker/` directory, create a file named `.env` and copy the contents as shown, replacing *"XXXX"* by the frontend and backend ports you want your application to run on.
    ```
    PORT_BACKEND=XXXX
    PORT_FRONTEND=XXXX
    ```
- Backend env:   
      As suggested in the `.env.sample` present at the `src/backend` directory, create a file named `.env` and copy the contents as shown, replacing *"..."* with the respective values for your registered github oauth application's **GITHUB_OAUTH_CLIENT_ID** and **GITHUB_OAUTH_CLIENT_SECRET**. Fill in the **MONGO_API_KEY** and **MONGO_APP_ID** you obtain upon creating a cluster in *MongoDB Atlas*
    ```
    GITHUB_OAUTH_CLIENT_ID=...
    GITHUB_OAUTH_CLIENT_SECRET=...
    MONGO_API_KEY=...
    MONGO_APP_ID=...
    ```
- Frontend env:   
      As suggested in the `.env.sample` present at the `src/frontend` directory, create a file named `.env` and copy the contents as shown, replacing *"..."* with the respective values for your registered github oauth application's **VITE_APP_GITHUB_OAUTH_CLIENT_ID** and **VITE_APP_GITHUB_OAUTH_CLIENT_SECRET**. For the **VITE_APP_GITHUB_OAUTH_REDIRECT_URL** enter the public url of the application's `/login` route. (Example: `http://df.mdgspace.org/login`). Also, add the port at which your backend is running in place of *"XXXX"*.
    ```
    VITE_APP_GITHUB_OAUTH_CLIENT_ID=...
    VITE_APP_GITHUB_OAUTH_CLIENT_SECRET=...
    VITE_APP_GITHUB_OAUTH_REDIRECT_URL=...
    VITE_APP_BACKEND_PORT=XXXX
    ```

### 3. Build Docker Image

> If you do not have docker installed on your system, visit [this](https://docs.docker.com/engine/install/).   
 
Navigate to the `docker` directory and build the images in the background using the following command.
```bash
cd docker/
docker compose up --build -d
```

### 4. Setup Named Pipes

Navigate to the `docker/named_pipe` directory and execute the `listen.sh` script to allow the application to run commands on the host.
```bash
cd docker/named_pipe
./listen.sh
```
> Make sure to check the permissions of the `listen.sh` file. You can change them using the `chmod` command.

### 5. Installing and Configuring NGINX

Install NGINX on your server from [here](https://www.nginx.com/resources/wiki/start/topics/tutorials/install/).   
Refer to [this](https://www.digitalocean.com/community/tutorials/how-to-set-up-nginx-server-blocks-virtual-hosts-on-ubuntu-16-04) to configure NGINX to serve your application.

### 6. Adding the DNS Records and Issue SSL Certificates

Refer to [this](https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/) to add DNS records for *df.yourorgname.com* and also a wildcard DNS record for **.df.yourorgname.com*

You can use [letsencrypt](https://letsencrypt.org/) to issue SSL certificates for *df.yourorgname.com* and a wildcard SSL certificate for **.df.yourorgname.com*.
