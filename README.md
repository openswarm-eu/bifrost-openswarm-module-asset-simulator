# ModuleTemplate

## Compile and run your module

Install devDependencies (this step should already be complete if you used create-bifrost-module).

```sh
npm i
```

Run the backend code

```sh
npm start
```

or Run from bifrost-zero-modules/ directory

```sh
cd ../
npm run ModuleTemplate
```

This will also compile your typescript files into your local build directory.
You can change your compiler preferences by editing 'tsconfig.json'.

## Docker

If the BIFROST core is running in a docker container, change the host of the moduleURL to `host.docker.internal` in [ModuleTemplate.ts](src/ModuleTemplate.ts), or

run the module in a docker container with:

```sh
cd ../
docker-compose -f ./ModuleTemplate/docker-compose.yml up --build
```