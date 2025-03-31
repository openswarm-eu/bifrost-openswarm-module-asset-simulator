# PoC1 PV Simulation Module
Reads in data from ```./data/csv/profile-data.csv``` and adds the load/ev/chp/bat data to the buildings depending on their stackable for the ```POWERGRID-CONNECTOR```.
    - PV data requires ```SOLAR-PANEL```
    - EV data ```CHARGING-POLE```
    - Household Battery data requires ```HOUSEHOLD-BATTERY```
    - CHP data requires ```CHP-STACK```
      If the EV should not charge, set the ```POWERED``` dynamic of the ```CHARGING-POLE``` to false
There is the global dynamic ```PERCENTAGE-REACTIVE-POWER``` which determines how much % of the active-power is also generated as reactive power.

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
env MODULE_URL=http://host.docker.internal:1808 
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
docker build -f ./docker/Dockerfile-module -t energy-community-pv-simulator:latest .
```

Or run the module in a docker container with (along with BIFROST ZERO):
```sh
docker-compose -f ./docker/docker-compose.yml up -d --build
```