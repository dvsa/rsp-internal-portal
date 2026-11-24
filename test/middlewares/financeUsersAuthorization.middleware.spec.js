import sinon from 'sinon';
import config from '../../src/server/config';
import { reportsAuthorizer, reversePaymentAuthorizer } from '../../src/server/middlewares/financeUsersAuthorization.middleware';

describe('finance authorisation', () => {
  let res;
  let next;

  beforeEach(() => {
    sinon.stub(config, 'doRoleChecks').returns(true);
    res = { render: sinon.spy() };
    next = sinon.spy();
  });
  afterEach(() => sinon.restore());

  [
    { middleware: reportsAuthorizer, allowed: ['BankingFinance', 'ContactCentre'], denied: ['FrontLine'] },
    { middleware: reversePaymentAuthorizer, allowed: ['BankingFinance'], denied: ['ContactCentre', 'FrontLine'] },
  ].forEach(({ middleware, allowed, denied }) => {
    allowed.forEach((role) => {
      it(`allows ${role} for ${middleware.name}`, () => {
        middleware({ session: { rsp_user_role: role } }, res, next);
        sinon.assert.calledOnce(next);
      });
    });
    denied.concat([undefined, ['Other']]).forEach((role) => {
      it(`denies ${String(role)} for ${middleware.name}`, () => {
        const session = { rsp_user_role: role };
        middleware({ session }, res, next);
        sinon.assert.notCalled(next);
        sinon.assert.calledWith(res.render, 'main/forbidden', session);
      });
    });
    it(`accepts an authorised role in an array for ${middleware.name}`, () => {
      middleware({ session: { rsp_user_role: ['Other', allowed[0]] } }, res, next);
      sinon.assert.calledOnce(next);
    });
    it(`bypasses ${middleware.name} when role checks are disabled`, () => {
      config.doRoleChecks.returns(false);
      middleware({ session: {} }, res, next);
      sinon.assert.calledOnce(next);
    });
  });
});
