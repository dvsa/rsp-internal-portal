# RSP Internal Portal
Internal portal for Roadside Payments Project.

This project is a NodeJS + Express based application and is meant to be served through a serverless environment (AWS Lambda + S3 Bucket + DynamoDB + API Gateway).  

Work in progress.

## DVSA Front-end Kit
This project uses the [DVSA front-end](https://dvsa-front-end.herokuapp.com/) kit, which means all view templates/macros are available and should be used whenever possible to ensure maximum consistency accross DVSA projects.

More information about this available on [github](https://github.com/dvsa/front-end)

### Running the app locally 

To run this project locally, clone the repository and the instructions below:

Use Node.js 24 (see `.nvmrc`).
1. `npm install` 
Installs all project dependencies

2. `npm run build`
Builds the dvsa-frontend specific resources and also the server related code.
This will create a `build/` directory with the transpiled code and required assets as well

3. `npm run start-server`
Runs the server from the `build/` directory. Note that this will use the Views and Assets that sit within the `build/` directory. There is no automatic reloading (on source code change) so for development purposes please use the next command instead.

> [!NOTE]
> When `USE_SECRETS_MANAGER=true`, the local server loads the configured AWS secret
> but overrides `URL_ROOT` and `REDIRECT_URI` with local environment variables.
> Set `URL_ROOT` to an empty string and `REDIRECT_URI` to the registered local
> Cognito callback.

4. `npm run start-dev-server`
Runs the application in development mode, meaning that source code changes will trigger a rebuild and server reload. 

### Testing

To run unit tests, run
`npm run test`
or
`test:watch`
to re-run the tests automatically whenever source code changes

#### Coverage

`npm run test:coverage` uses nyc to run the unit tests and report coverage for
`src/server/**/*.js`, `src/lambdas/**/*.js` and `src/handler.js`, including
unloaded files. It writes an HTML report to `coverage/index.html` and fails
below 95% line coverage. The report does not include
integration tests, browser assets outside `src/server`, or build scripts.
Coverage measures executed lines, not correctness or route completeness.

The existing unit tests import the application configuration, which calls
`dotenv.config()`. Run them in an isolated checkout without a real `.env` or
AWS credentials if those files must not be accessed.

#### Manual HTTP integration baseline

Run `npm run test:integration` manually, outside CI. This starts the Express
application on an ephemeral loopback port using the source views, a temporary
working directory and synthetic configuration. It uses synthetic JWTs and a
mock JWKS, and Nock interceptors for the identity, penalty, payment and CPMS
services. External and unregistered connections are blocked; no real
transactions or shared data are used. The runner closes the listener and removes
its temporary directory.

The suite covers login and logout, authentication and role denials, search,
group and individual cancellation, cash payment recording, and selected report
requests and downloads, plus synthetic REST API Gateway adapter events. It
checks status codes, redirects, rendered content and selected outbound requests.
The following remain outside this baseline:
token refresh and expired-token paths, other payment methods and grouped
payments, confirmations and receipts, authorised reversals, grouped details,
report failure and timeout paths, and static assets. Passing it does not verify
deployed behaviour, AWS permissions,
real Cognito authentication, payment outcomes or data persistence.

Unit tests also cover failed token exchanges and report downloads. These do not
replace HTTP integration coverage of those error paths.

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
