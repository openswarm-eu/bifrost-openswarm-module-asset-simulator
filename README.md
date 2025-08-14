# RealityTwin EC Asset Simulation Module

Fork for BIFROST reality twin adoption of the OpenSwarm energy-community-asset-simulator (https://code.siemens.com/openswarm/energy-community-asset-simulator)

To get the the latest changes you have to set an additional remote connection with
```bash
git remote add energy-community-asset-simulator git@code.siemens.com:openswarm/energy-community-asset-simulator.git
```
Pull the changes from the `realitytwin` branch with
```bash
git checkout realitytwin
git pull energy-community-asset-simulator realitytwin
```

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
docker build -f ./docker/Dockerfile.module -t energy-community-asset-simulator:latest .
```

Or run the module in a docker container with (along with BIFROST ZERO):
```sh
docker-compose -f ./docker/docker-compose.yml up -d --build
```

## Configuration of the Module

The EC Asset Simulation Module uses a flexible configuration system that supports customization of asset parameters through YAML files. 
The configuration system automatically falls back to sensible defaults for any parameters not specified in your YAML file. This means you only need to define the values you want to change.
For detailed information about configuration options and default values, see: [Configuration Documentation](docs/configuration-defaults.md)

## Release a New Version

**ATTENTION**: Be sure before releasing, that all components are tested with the tagged version!

For release a separate branch `release` is used. By merging your commits to this branch, make a release commit (see below), tag the new version and pushing the tag & release commit a new image of this module and data-handler is built.
Please stick to following procedure:

1. Merge all commits to be released into the `release` branch:
    ```bash
    git checkout release
    git merge main
    ```
2. Make a release commit (maybe with a short description)
    * increase the version number [in section "Current Version" of this README](#current-version)
    * commit this change with
    ```bash
    git add *
    git commit -m "CHORE: release new version"
    ```
3. Tag this commit (and move the `latest` tag to this commit)
    ```bash
    git tag -d latest
    git push origin :refs/tags/latest
    git tag -a vX.Y.Z -m "Add an optional tag description here"
    git tag -a latest -m "Latest tagged version"
    ```
4. Push the commit and tag
    ```bash
    git push
    git push origin vX.Y.Z
    git push origin latest
    ```
    After pushing the tag the CI/CD pipeline is initiated and a new container image is built.
5. Continue working on the `main` branch
     ```bash
    git checkout main
    ```

There is a PowerShell script `releaseNewVersion.ps1` which does the above in one step. Use it with care!

## RealityTwin Extensions

This module version provides additional REST endpoints, which are accessed by the RealityTwin hardware modules.

### EV-STATION
To write data to this charging poles, the endpoint ```/rest/updateCars``` needs to be satisfied.
```
curl --request POST \
  --url http://127.0.0.1:7032/rest/updateCars \
  --header 'content-type: application/json' \
  --data '{
  "EV-STATION::[4|-2,4|-1,5|-2,5|-1]@EXPERIMENT::FwpXHh6o": [-1,-1,-1],
  "expId": ["EXPERIMENT::qOPprfAn"]
}'
```
Where the EV-STATION needs to be the full BIFROST id of your wanted EV-STATION and the list describes the car which
is currently connected to the according slot. For example ```[1,-1,2]``` connects car 1 to slot 1 and car 2 to slot 3.

## Current Version

vX.Y.Z (see `release` branch. `vX.Y.Z-A` indicates a re-release of a version (mostly fixes), the flag `-A` can be ignored when docker images are used)