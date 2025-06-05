# PoC1 EC Asset Simulation Module

This module simulates all assets of the Energy Community (EC) tackled in the PoC1 use cases of the OpenSwarm project.

This module Reads in data from `./data/csv/profile-data.csv` and adds the PV or electro vehicle (EV) data to the buildings depending on their stackable for the `POWERGRID-CONNECTOR`. It also provides measurement data and limits for feeder line grid sensors.
  - PV data requires `SOLAR-PANEL`
  - EV data `CHARGING-POLE`
  - Grid Sensor Measurements requires `GRID-SENSOR`

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

## OpenSwarm github Repository
Here some commands which where used to mirror the code.siemens.com repository to the openswarm github repository:
```sh
git remote add openswarmgithub https://github.com/openswarm-eu/bifrost-openswarm-module-asset-simulator.git
git push openswarmgithub main
git push openswarmgithub release
git push openswarmgithub v1.1.0
git push openswarmgithub latest
```

## Current Version

vX.Y.Z (see `release` branch. `vX.Y.Z-A` indicates a re-release of a version (mostly fixes), the flag `-A` can be ignored when docker images are used)