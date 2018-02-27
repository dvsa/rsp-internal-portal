# RSP Internal Portal
Internal portal for Roadside Payments Project.

This project is a NodeJS + Express based application and is meant to be served through a serverless environment (AWS Lambda + S3 Bucket + DynamoDB + API Gateway).  

Work in progress.

## DVSA Front-end Kit
This project uses the [DVSA front-end](https://dvsa-front-end.herokuapp.com/) kit, which means all view templates/macros are available and should be used whenever possible to ensure maximum consistency accross DVSA projects.

More information about this available on [github](https://github.com/dvsa/front-end)

### Running the app locally 

To run this project locally, clone the repository and the instructions below:

1. `npm install` 
Installs all project dependencies

2. `npm run build`
Builds the dvsa-frontend specific resources and also the server related code.
This will create a `build/` directory with the transpiled code and required assets as well

3. `npm run start-server`
Runs the server from the `build/` directory. Note that this will use the Views and Assets that sit within the `build/` directory. There is no automatic reloading (on source code change) so for development purposes please use the next command instead.

4. `npm run start-dev-server`
Runs the application in development mode, meaning that source code changes will trigger a rebuild and server reload. 

### Testing

To run unit tests, run
`npm run test`
or
`test:watch`
to re-run the tests automatically whenever source code changes

### Distribution

Run the following command to build, bundle and package the required artifacts.
`npm run package`

The resulting archive (package.zip) will be available on the `dist/` directory and ready for deployment.

### Git Hooks

Please set up the following prepush git hook in .git/hooks/pre-push

```
#!/bin/sh
npm run prepush && git log -p | scanrepo
```

#### Security

Please install and run the following securiy programs as part of your testing process:

https://github.com/awslabs/git-secrets

- After installing, do a one-time set up with `git secrets --register-aws`. Run with `git secrets --scan`.

https://github.com/UKHomeOffice/repo-security-scanner

- After installing, run with `git log -p | scanrepo`.

These will be run as part of prepush so please make sure you set up the git hook above so you don't accidentally introduce any new security vulnerabilities.