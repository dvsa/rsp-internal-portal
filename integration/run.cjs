'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

if (['CI', 'GITHUB_ACTIONS', 'JENKINS_URL', 'GITLAB_CI', 'BUILDKITE'].some((key) => process.env[key])) {
  console.error('Integration tests are manual only and cannot run in CI.');
  process.exit(1);
}

const root = path.resolve(__dirname, '..');
const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'rsp-integration-'));
try {
  const result = spawnSync(process.execPath, [
    require.resolve('mocha/bin/mocha.js'),
    '--require', path.join(__dirname, 'register.cjs'),
    path.join(__dirname, 'http.spec.cjs'),
  ], {
    cwd,
    stdio: 'inherit',
    timeout: 60000,
    env: {
      PATH: path.dirname(process.execPath),
      HOME: cwd,
      TMPDIR: cwd,
      RSP_INTEGRATION_ISOLATED: '1',
      NODE_ENV: 'production',
      USE_SECRETS_MANAGER: 'false',
      AWS_EC2_METADATA_DISABLED: 'true',
      AWS_SHARED_CREDENTIALS_FILE: path.join(cwd, 'no-credentials'),
      AWS_CONFIG_FILE: path.join(cwd, 'no-config'),
      VIEWS: path.join(root, 'src/server/views'),
      REGION: 'eu-west-1',
      COGNITO_USERPOOL_ID: 'synthetic-pool',
      COGNITO_URL: 'https://identity.example.test',
      CLIENT_ID: 'synthetic-client',
      CLIENT_SECRET: 'synthetic-secret',
      IDENTITY_PROVIDER: 'synthetic-provider',
      REDIRECT_URI: 'https://portal.example.test/login',
      PENALTY_SERVICE_URL: 'https://penalty.example.test/',
      PAYMENT_SERVICE_URL: 'https://payment.example.test/',
      CPMS_SERVICE_URL: 'https://cpms.example.test/',
      PUBLIC_ASSETS: 'https://assets.example.test',
      URL_ROOT: '/portal',
      DO_ROLE_CHECKS: 'true',
      DO_SIGNED_REQUESTS: 'false',
    },
  });
  if (result.error) {
    console.error(`Integration runner failed: ${result.error.message}`);
    process.exitCode = 1;
  } else {
    process.exitCode = result.status === null ? 1 : result.status;
  }
} finally {
  fs.rmSync(cwd, { recursive: true, force: true });
}
