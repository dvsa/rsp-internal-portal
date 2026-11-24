'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const https = require('node:https');
const net = require('node:net');
const nock = require('nock');
const createJwksMock = require('mock-jwks').default;
const awsServerlessExpress = require('aws-serverless-express');

if (process.env.RSP_INTEGRATION_ISOLATED !== '1'
  || ['CI', 'GITHUB_ACTIONS', 'JENKINS_URL', 'GITLAB_CI', 'BUILDKITE'].some((key) => process.env[key])) {
  throw new Error('Run this suite using the isolated manual integration runner.');
}

describe('Express HTTP baseline', function () {
  this.timeout(10000);
  let server;
  let port;
  let jwks;
  let originalConnect;
  let unexpectedRequests;
  let lambdaServer;
  let originalCreateServer;
  const penalty = {
    ID: '123456_FPN',
    Enabled: true,
    Value: {
      penaltyType: 'FPN',
      referenceNo: '123456',
      paymentToken: '1234567890abcdef',
      paymentStatus: 'UNPAID',
      penaltyAmount: 100,
      vehicleDetails: { regNo: 'AB12CDE' },
      placeWhereIssued: 'Example location',
      dateTime: 1577836800,
      paymentCodeDateTime: 1577836800,
    },
  };

  function recordUnexpectedRequest(request, options) {
    const target = options || request;
    const allowedTcp = (target.host === '127.0.0.1' || target.hostname === '127.0.0.1')
      && Number(target.port) === port;
    const allowedSocket = lambdaSocketPath() && target.socketPath === lambdaSocketPath();
    if (!allowedTcp && !allowedSocket) {
      unexpectedRequests += 1;
    }
  }

  function lambdaSocketPath() {
    return lambdaServer && `/tmp/server-${lambdaServer._socketPathSuffix}.sock`;
  }

  function request(method, path, { role, body, rawCookie } = {}) {
    let cookie = rawCookie;
    if (role) {
      const token = jwks.token({ 'custom:Role': role, email: 'synthetic@example.test' });
      cookie = `rsp_access=${encodeURIComponent(`j:${JSON.stringify({ accessToken: token, idToken: token })}`)}`;
    }
    const data = body === undefined ? undefined : new URLSearchParams(body).toString();
    return new Promise((resolve, reject) => {
      const req = http.request({
        host: '127.0.0.1',
        port,
        method,
        path,
        headers: {
          ...(cookie ? { Cookie: cookie } : {}),
          ...(data === undefined ? {} : {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(data),
          }),
        },
        timeout: 5000,
      }, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks).toString('utf8'),
        }));
      });
      req.on('timeout', () => req.destroy(new Error('HTTP request timed out')));
      req.on('error', reject);
      req.end(data);
    });
  }

  before(async () => {
    nock.disableNetConnect();
    nock.emitter.on('no match', recordUnexpectedRequest);
    originalConnect = net.Socket.prototype.connect;
    net.Socket.prototype.connect = function guardedConnect(...args) {
      const options = Array.isArray(args[0]) ? args[0][0] : args[0];
      const allowedTcp = options && options.host === '127.0.0.1' && Number(options.port) === port;
      const allowedSocket = options && lambdaSocketPath() && options.path === lambdaSocketPath();
      if (!allowedTcp && !allowedSocket) {
        throw new Error('Unexpected network connection blocked by integration suite');
      }
      return originalConnect.apply(this, args);
    };
    const createApp = require('../src/server/app').default;
    const app = await createApp();
    server = await new Promise((resolve, reject) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
      listener.once('error', reject);
    });
    port = server.address().port;
    nock.enableNetConnect((host) => host === `127.0.0.1:${port}` || (lambdaServer && host === 'localhost:80'));
  });

  beforeEach(() => {
    unexpectedRequests = 0;
    jwks = createJwksMock('https://cognito-idp.eu-west-1.amazonaws.com', '/synthetic-pool/.well-known/jwks.json');
    jwks.start();
  });

  afterEach(() => {
    const pending = nock.pendingMocks().filter((entry) => !entry.includes('/synthetic-pool/.well-known/jwks.json'));
    jwks.stop();
    nock.cleanAll();
    assert.deepEqual(pending, [], 'An expected downstream request was not made');
    assert.equal(unexpectedRequests, 0, 'An unexpected downstream request was attempted');
  });

  after(async () => {
    if (originalConnect) net.Socket.prototype.connect = originalConnect;
    nock.cleanAll();
    nock.emitter.removeListener('no match', recordUnexpectedRequest);
    nock.enableNetConnect();
    if (originalCreateServer) awsServerlessExpress.createServer = originalCreateServer;
    if (lambdaServer && lambdaServer.listening) {
      await new Promise((resolve, reject) => lambdaServer.close((error) => (error ? reject(error) : resolve())));
    }
    if (server) await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  });

  it('serves robots and security headers without authentication', async () => {
    const res = await request('GET', '/robots.txt');
    assert.equal(res.status, 200);
    assert.match(res.body, /User-agent: \*\nDisallow: \//);
    assert.match(res.headers['content-type'], /^text\/plain/);
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.match(res.headers['cache-control'], /no-store/);
    assert.equal(res.headers['x-powered-by'], undefined);
  });

  it('redirects unauthenticated routes and clears cookies on logout', async () => {
    const res = await request('GET', '/');
    assert.equal(res.status, 302);
    assert.equal(res.headers.location, '/portal/login');
    const logout = await request('GET', '/logout');
    assert.equal(logout.status, 302);
    assert.match(logout.headers.location, /^https:\/\/identity\.example\.test\/logout\?/);
    assert.equal(logout.headers['set-cookie'].filter((value) => /rsp_(access|refresh)=/.test(value)).length, 2);
  });

  it('redirects login to the configured identity provider', async () => {
    const res = await request('GET', '/login');
    const url = new URL(res.headers.location);
    assert.equal(res.status, 302);
    assert.equal(url.origin, 'https://identity.example.test');
    assert.equal(url.pathname, '/oauth2/authorize');
    assert.equal(url.searchParams.get('response_type'), 'code');
    assert.equal(url.searchParams.get('redirect_uri'), 'https://portal.example.test/login');
  });

  it('sets secure authentication cookies on a successful callback', async () => {
    const scope = nock('https://identity.example.test')
      .post('/oauth2/token', (body) => body.grant_type === 'authorization_code' && body.code === 'synthetic-code')
      .reply(200, { access_token: 'synthetic-access', id_token: 'synthetic-id', refresh_token: 'synthetic-refresh', expires_in: 300 });
    const res = await request('GET', '/login?code=synthetic-code');
    assert.equal(res.status, 302);
    assert.equal(res.headers.location, '/portal/');
    assert.equal(res.headers['set-cookie'].filter((value) => /rsp_(access|refresh)=/.test(value) && /HttpOnly/.test(value) && /Secure/.test(value)).length, 2);
    assert.ok(scope.isDone());
  });

  it('renders the search and cookie pages for an authorised user', async () => {
    for (const [path, content] of [['/', /Search DVSA roadside fines/], ['/cookie-details', /cookie/i], ['/cookie-preferences', /cookie/i]]) {
      const res = await request('GET', path, { role: 'FrontLine' });
      assert.equal(res.status, 200);
      assert.match(res.body, content);
    }
  });

  it('renders forbidden for an unrecognised role', async () => {
    const res = await request('GET', '/', { role: 'Unrecognised' });
    assert.equal(res.status, 200);
    assert.match(res.body, /Access forbidden/);
  });

  it('rejects invalid tokens without calling a downstream service', async () => {
    const cookie = `rsp_access=${encodeURIComponent('j:{"accessToken":"invalid","idToken":"invalid"}')}`;
    const res = await request('GET', '/', { rawCookie: cookie });
    assert.equal(res.status, 200);
    assert.match(res.body, /Access forbidden/);
  });

  it('normalises payment code searches and rejects blank registrations', async () => {
    const code = await request('POST', '/', { role: 'FrontLine', body: { 'search-by': 'code', payment_code: 'AB_CD-12' } });
    assert.equal(code.status, 302);
    assert.equal(code.headers.location, '/portal/payment-code/abcd12');
    const blank = await request('POST', '/', { role: 'FrontLine', body: { 'search-by': 'vehicle-reg', vehicle_reg: ' ' } });
    assert.equal(blank.status, 302);
    assert.equal(blank.headers.location, '/portal/?invalidReg');
  });

  it('normalises a vehicle registration and calls the penalty search contract', async () => {
    const scope = nock('https://penalty.example.test')
      .get('/vehicle-reg/AB12CDE')
      .reply(200, { Penalties: [], PenaltyGroups: [] });
    const res = await request('GET', '/vehicle-reg-search-results/ab12%20cde', { role: 'FrontLine' });
    assert.equal(res.status, 200);
    assert.match(res.body, /AB12CDE/);
    assert.ok(scope.isDone());
  });

  it('redirects when the vehicle search service rejects the search', async () => {
    nock('https://penalty.example.test').get('/vehicle-reg/AB12CDE').reply(404, {});
    const res = await request('GET', '/vehicle-reg-search-results/AB12CDE', { role: 'FrontLine' });
    assert.equal(res.status, 302);
    assert.equal(res.headers.location, '/portal/?invalidReg');
  });

  it('denies frontline access to reports and reversals without downstream requests', async () => {
    for (const [method, path] of [['GET', '/reports'], ['POST', '/payment-code/synthetic/reversePayment']]) {
      const res = await request(method, path, { role: 'FrontLine' });
      assert.equal(res.status, 200);
      assert.match(res.body, /Access forbidden/);
    }
  });

  it('loads reports for finance users using the CPMS request contract', async () => {
    const scope = nock('https://cpms.example.test')
      .post('/listReports/', { penalty_type: 'FPN' })
      .reply(200, { items: [] });
    const res = await request('GET', '/reports', { role: 'BankingFinance' });
    assert.equal(res.status, 200);
    assert.match(res.body, /report/i);
    assert.ok(scope.isDone());
  });

  it('does not generate a report for an invalid date range', async () => {
    const res = await request('POST', '/reports', {
      role: 'BankingFinance',
      body: { dateFrom: '2020-02-01', dateTo: '2020-01-01', penaltyType: 'FPN', reportCode: 'test' },
    });
    assert.equal(res.status, 302);
    assert.match(res.headers.location, /reports\?failure&type=/);
  });

  it('generates a report with the current CPMS contract', async () => {
    const scope = nock('https://cpms.example.test')
      .post('/generateReport/', {
        penalty_type: 'FPN',
        report_code: 'example',
        from_date: '2020-01-01 00:00:00',
        to_date: '2020-01-02 23:59:00',
      })
      .reply(200, { code: '000', reference: 'synthetic-report' });
    const res = await request('POST', '/reports', {
      role: 'ContactCentre',
      body: { dateFrom: '2020-01-01', dateTo: '2020-01-02', penaltyType: 'FPN', reportCode: 'example' },
    });
    assert.equal(res.status, 200);
    assert.match(res.body, /synthetic-report/);
    assert.ok(scope.isDone());
  });

  it('retrieves a report status and downloads its contents', async () => {
    const cpms = nock('https://cpms.example.test')
      .post('/checkReportStatus/', { penalty_type: 'FPN', report_ref: 'synthetic-report' })
      .reply(200, { completed: true })
      .post('/downloadReport/', { penalty_type: 'FPN', report_ref: 'synthetic-report' })
      .reply(200, 'synthetic,csv');
    const status = await request('GET', '/reports/synthetic-report/status?penalty_type=FPN', { role: 'BankingFinance' });
    assert.equal(status.status, 200);
    assert.deepEqual(JSON.parse(status.body), { completed: true });
    const file = await request('GET', '/reports/synthetic-report/download?penalty_type=FPN&filename=report.csv', { role: 'BankingFinance' });
    assert.equal(file.status, 200);
    assert.equal(file.body, 'synthetic,csv');
    assert.equal(file.headers['content-disposition'], 'attachment; filename=report.csv');
    assert.ok(cpms.isDone());
  });

  it('cancels a group through the penalty service and redirects', async () => {
    const scope = nock('https://penalty.example.test').delete('/penaltyGroup/synthetic123').reply(200, {});
    const res = await request('POST', '/payment-code/synthetic123/cancel', { role: 'FrontLine' });
    assert.equal(res.status, 302);
    assert.equal(res.headers.location, '/portal/payment-code/synthetic123');
    assert.ok(scope.isDone());
  });

  it('reports a rejected group cancellation without retrying it', async () => {
    const scope = nock('https://penalty.example.test').delete('/penaltyGroup/synthetic123').reply(400, {});
    const res = await request('POST', '/payment-code/synthetic123/cancel', { role: 'FrontLine' });
    assert.equal(res.status, 302);
    assert.equal(res.headers.location, '/portal/payment-code/synthetic123?cancellation=failed');
    assert.ok(scope.isDone());
  });

  it('cancels a penalty with the fetched document as its DELETE body', async () => {
    const scope = nock('https://penalty.example.test')
      .get('/documents/123456_FPN').reply(200, penalty)
      .delete('/documents/123456_FPN', penalty).reply(200, {});
    const res = await request('POST', '/penalty/123456_FPN/cancel', { role: 'FrontLine' });
    assert.equal(res.status, 302);
    assert.equal(res.headers.location, '/portal/penalty/123456_FPN');
    assert.ok(scope.isDone());
  });

  it('records a cash payment using stubbed CPMS and payment service contracts', async () => {
    const search = nock('https://penalty.example.test')
      .get('/documents/tokens/1234567890abcdef').reply(200, penalty);
    const cpms = nock('https://cpms.example.test')
      .post('/cashPayment/', (body) => (
        body.payment_code === '1234567890abcdef'
        && body.penalty_reference === '123456'
        && body.penalty_type === 'FPN'
        && body.penalty_amount === 100
        && body.slip_number === '123'
        && body.vehicle_reg === 'AB12CDE'
      )).reply(200, { receipt_reference: 'synthetic-receipt' });
    const payment = nock('https://payment.example.test')
      .post('/payments/', (body) => (
        body.PenaltyStatus === 'PAID'
        && body.PenaltyType === 'FPN'
        && body.PenaltyReference === '123456'
        && body.PaymentDetail.PaymentMethod === 'CASH'
        && body.PaymentDetail.PaymentRef === 'synthetic-receipt'
        && body.PaymentDetail.PaymentAmount === 100
        && Number.isInteger(body.PaymentDetail.PaymentDate)
      )).reply(200, {});
    const res = await request('POST', '/payment-code/1234567890abcdef/payment', {
      role: 'FrontLine',
      body: { paymentType: 'cash', slipNumber: '123' },
    });
    assert.equal(res.status, 302);
    assert.equal(res.headers.location, '/portal/payment-code/1234567890abcdef');
    assert.ok(search.isDone() && cpms.isDone() && payment.isDone());
  });

  it('does not contact payment services when payment type is missing', async () => {
    const res = await request('POST', '/payment-code/1234567890abcdef/payment', {
      role: 'FrontLine',
      body: {},
    });
    assert.equal(res.status, 302);
    assert.equal(res.headers.location, '/portal/payment-code/1234567890abcdef');
  });

  it('blocks unregistered external and direct network connections', async () => {
    assert.throws(() => net.connect({ host: 'example.test', port: 443 }), /Unexpected network connection/);
    const error = await new Promise((resolve, reject) => {
      https.get('https://unregistered.example.test/', () => reject(new Error('Unexpected HTTP response')))
        .on('error', resolve);
    });
    assert.equal(error.code, 'ENETUNREACH');
    assert.equal(unexpectedRequests, 1);
    unexpectedRequests = 0;
  });

  it('adapts REST API Gateway events, including paths, binary bodies and cookies', async () => {
    originalCreateServer = awsServerlessExpress.createServer;
    awsServerlessExpress.createServer = (...args) => {
      lambdaServer = originalCreateServer(...args);
      return lambdaServer;
    };
    const { handler } = require('../src/handler');
    const event = (path) => ({
      httpMethod: 'GET',
      path,
      headers: { Host: 'portal.example.test', 'X-Forwarded-Proto': 'https' },
      multiValueHeaders: {},
      requestContext: { identity: { sourceIp: '127.0.0.1' }, stage: 'test' },
      resource: '/{proxy+}',
      isBase64Encoded: false,
    });
    const robots = await handler(event('/stage/robots.txt'), {});
    assert.equal(robots.statusCode, 200);
    assert.equal(robots.isBase64Encoded, true);
    assert.match(Buffer.from(robots.body, 'base64').toString('utf8'), /Disallow: \//);
    const logout = await handler(event('/stage/logout'), {});
    assert.equal(logout.statusCode, 302);
    const cookies = Object.entries(logout.headers)
      .filter(([key]) => key.toLowerCase() === 'set-cookie')
      .map(([, value]) => value);
    assert.ok(cookies.some((value) => value.startsWith('rsp_access=')));
    assert.ok(cookies.some((value) => value.startsWith('rsp_refresh=')));
    const secure = await handler(event('/stage/'), {});
    assert.equal(secure.statusCode, 302);
    assert.equal(secure.headers.location, '/portal/login');
  });
});
