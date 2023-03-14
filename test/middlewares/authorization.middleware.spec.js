import sinon from 'sinon';
import { expect } from 'chai';
import config from '../../src/server/config';
import authorizationMiddleware from '../../src/server/middlewares/authorization.middleware';
import * as verify from '../../src/server/middlewares/verifyToken';
import { AuthorizationError, AuthorizationErrorCode } from '../../src/server/utils/authorisationError';
import AuthService from '../../src/server/services/auth.service';

const request = {
  session: {},
  cookies: {
    rsp_refresh: {
      refreshToken: 'token',
    },
    rsp_access: {
      accessToken: 'accessToken',
      idToken: 'idTokenNoRole',
    },
  },
};

describe('AuthorizationMiddleware', () => {
  let redirectSpy;
  let renderSpy;
  let next;
  let verifyStub;
  let userTokenStub;
  let response;
  let authServiceStub;

  beforeEach(async () => {
    redirectSpy = sinon.spy();
    renderSpy = sinon.spy();
    next = sinon.mock();
    verifyStub = sinon.stub(verify, 'verifyToken').resolves(true);
    userTokenStub = sinon.stub(verify, 'userToken').returns({
      'custom:Role': '[Admin, BankingFinance]',
      name: 'User Name',
      email: 'name@email.com',
    });
    sinon.createStubInstance(AuthService);
    authServiceStub = sinon.stub(AuthService.prototype, 'refreshAccessToken').resolves({});
    sinon.stub(config, 'urlRoot').returns('http://urlRoot');
    sinon.stub(config, 'cognitoUrl').returns('http://cognitoUrl');
    sinon.stub(config, 'doRoleChecks').returns(true);
    response = {
      redirect: redirectSpy, render: renderSpy, headers: {}, cookie(name, value) { this.headers[name] = value; }, clearCookie(name) { delete this.headers[name]; },
    };
  });

  afterEach(async () => {
    redirectSpy.resetHistory();
    renderSpy.resetHistory();
    next.resetHistory();
    verifyStub.restore();
    userTokenStub.restore();
    config.urlRoot.restore();
    config.doRoleChecks.restore();
    config.cognitoUrl.restore();
    AuthService.prototype.refreshAccessToken.restore();
  });

  context('Logging in as an authenticated Admin user', () => {
    it('should succeed and call next', async () => {
      await authorizationMiddleware(request, response, next);
      sinon.assert.called(next);
    });
  });

  context('Logging in with no token', () => {
    it('should redirect to login', async () => {
      const mockRequest = {
        session: {},
        cookies: {},
      };
      await authorizationMiddleware(mockRequest, response, next);
      sinon.assert.calledWith(redirectSpy, 'http://urlRoot/login');
    });
  });

  context('logging in as a user with an invalid token', () => {
    it('should fail and redirect to login with no cookies', async () => {
      verifyStub.rejects(new AuthorizationError('Error', AuthorizationErrorCode.VERIFY_TOKEN_ERROR));
      const mockRequest = {
        session: {},
        cookies: {
          rsp_refresh: {
            refreshToken: 'token',
          },
        },
      };
      await authorizationMiddleware(mockRequest, response, next);
      sinon.assert.calledWith(response.redirect, 'http://urlRoot/login');
      expect(response.headers).to.not.have.property('rsp_access');
      expect(response.headers).to.not.have.property('rsp_refresh');
    });
  });

  context('logging in without a single authorized role', () => {
    it('should fail and redirect to forbidden page', async () => {
      userTokenStub.returns({
        'custom:Role': 'Fake',
      });
      await authorizationMiddleware(request, response, next);
      sinon.assert.calledWith(response.render, 'main/forbidden');
    });
  });

  context('logging in without multiple authorized roles', () => {
    it('should fail and redirect to forbidden page', async () => {
      userTokenStub.returns({
        'custom:Role': '[Invalid1, Invalid2]',
      });
      await authorizationMiddleware(request, response, next);
      sinon.assert.calledWith(response.render, 'main/forbidden');
    });
  });

  context('logging in without a role', () => {
    it('should fail and redirect to forbidden page', async () => {
      userTokenStub.returns({});
      await authorizationMiddleware(request, response, next);
      sinon.assert.calledWith(response.render, 'main/forbidden');
    });
  });

  context('logging in as a user with an expired token', () => {
    it('should refresh the token and redirect to next', async () => {
      authServiceStub.resolves({
        access_token: 'newToken', id_token: 'newIdToken',
      });
      verifyStub.onFirstCall().rejects(new AuthorizationError('Error', AuthorizationErrorCode.EXPIRED_TOKEN)).onSecondCall().resolves(true);

      await authorizationMiddleware(request, response, next);

      sinon.assert.called(next);
      expect(response.headers).to.have.deep.property('rsp_access', {
        accessToken: 'newToken',
        idToken: 'newIdToken',
      });
    });
  });

  context('logging in as a user with an expired token', () => {
    it('should refresh the token and redirect to login if refresh fails', async () => {
      authServiceStub.rejects(new Error('Error refreshing token'));
      verifyStub.rejects(new AuthorizationError('Error', AuthorizationErrorCode.EXPIRED_TOKEN));

      await authorizationMiddleware(request, response, next);

      sinon.assert.calledWith(response.redirect, 'http://urlRoot/login');
      expect(response.headers).to.not.have.property('rsp_access');
    });
  });
});
