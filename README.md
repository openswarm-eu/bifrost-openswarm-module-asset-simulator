# ProSeCOFragmentModul

## Compile and run your module

1. Install [Node.JS](https://nodejs.org/en) (tested with version 20.13.1, npm 10.5.2).

2. Install Node modules
```sh
npm install
```

3. Start BIFROST ZERO

4. Run the module
```sh
npm run start
```

This will also compile your typescript files into your local build directory. You can change your compiler preferences by editing `tsconfig.json`.

## Docker

### BIFROST Zero is running in Docker

If the BIFROST core is running in a docker container, change the host of the moduleURL to `host.docker.internal`. This can be done by setting the respective environment variable `MODULE_URL`:
```sh
docker-compose -f ./docker/docker-compose_bifrost_base.yml up -d
env MODULE_URL=http://host.docker.internal:3000 
npm run start
```

Alternatively you can use
```sh
docker-compose -f ./docker/docker-compose_bifrost_base.yml up -d
npm run start:docker
```
or for debugging
```sh
docker-compose -f ./docker/docker-compose_bifrost_base.yml up -d
npm run debug:docker
```

### Use the module in Docker:

To build a docker image of the module, use
```sh
docker build -f ./docker/Dockerfile-module -t siemergy-analysis-module:latest .
```

Or run the module in a docker container with (along with BIFROST ZERO):
```sh
docker-compose -f ./docker/docker-compose.yml up -d --build
```