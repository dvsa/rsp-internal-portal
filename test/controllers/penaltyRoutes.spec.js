import sinon from 'sinon';
import * as penaltyController from '../../src/server/controllers/penalty.controller';
import * as paymentCodeController from '../../src/server/controllers/paymentCode.controller';
import PenaltyService from '../../src/server/services/penalty.service';
import PenaltyGroupService from '../../src/server/services/penaltyGroup.service';

describe('penalty route validation and details', () => {
  let res;
  beforeEach(() => {
    res = { render: sinon.spy(), redirect: sinon.spy() };
  });
  afterEach(() => sinon.restore());

  async function getPenalty(req) {
    await Promise.all(penaltyController.validatePenaltyReference[0].map((validator) => validator.run(req)));
    penaltyController.getPenaltyDetails[1](req, res);
    await new Promise((resolve) => { setImmediate(resolve); });
  }

  it('renders valid penalty details', async () => {
    const get = sinon.stub(PenaltyService.prototype, 'getById').resolves({ status: 'UNPAID', enabled: true });
    await getPenalty({ params: { penalty_id: '123456_FPN' }, session: {} });
    sinon.assert.calledWithExactly(get, '123456_FPN');
    sinon.assert.calledWith(res.render, 'penalty/penaltyDetails', sinon.match({ isCancellable: true }));
  });

  it('rejects invalid references without a service call', async () => {
    const get = sinon.stub(PenaltyService.prototype, 'getById');
    await getPenalty({ params: { penalty_id: '!_FPN' }, session: {} });
    sinon.assert.notCalled(get);
    sinon.assert.calledWith(res.redirect, '../?invalidFPN');
  });

  it('redirects when the penalty lookup fails', async () => {
    sinon.stub(PenaltyService.prototype, 'getById').rejects(new Error('synthetic failure'));
    await getPenalty({ params: { penalty_id: '123456_FPN' }, session: {} });
    sinon.assert.calledWith(res.redirect, '../?invalidFPN');
  });

  it('normalises payment code form input', () => {
    const req = { body: { payment_code: 'AB_CD-12' } };
    const next = sinon.spy();
    paymentCodeController.normalizePaymentcode(req, res, next);
    sinon.assert.match(req.body.payment_code, 'abcd12');
    sinon.assert.calledOnce(next);
  });

  it('validates payment codes before continuing', async () => {
    const next = sinon.spy();
    const valid = { params: { payment_code: '1234567890abcdef' }, body: {} };
    const invalid = { params: { payment_code: 'invalid!' }, body: {} };
    const validators = paymentCodeController.validatePaymentCode[1];
    await Promise.all(validators.map((validator) => validator.run(valid)));
    paymentCodeController.validatePaymentCode[2](valid, res, next);
    sinon.assert.calledOnce(next);
    await Promise.all(validators.map((validator) => validator.run(invalid)));
    paymentCodeController.validatePaymentCode[2](invalid, res, next);
    sinon.assert.calledWith(res.redirect, '../../?invalidPaymentCode');
  });

  it('redirects failed payment code lookups', async () => {
    sinon.stub(PenaltyService.prototype, 'getByPaymentCode').rejects(new Error('synthetic failure'));
    await paymentCodeController.getPenaltyDetails[1]({ params: { payment_code: '1234567890abcdef' } }, res);
    sinon.assert.calledWith(res.redirect, '/?invalidPaymentCode');
  });

  it('renders, redirects overdue, and handles failed group breakdowns', async () => {
    const get = sinon.stub(PenaltyGroupService.prototype, 'getPaymentsByCodeAndType');
    get.onFirstCall().resolves({ isPaymentOverdue: false, penaltyDetails: [] });
    get.onSecondCall().resolves({ isPaymentOverdue: true });
    get.onThirdCall().rejects(new Error('synthetic failure'));
    const req = { params: { payment_code: 'synthetic', type: 'FPN' }, session: {} };
    const invokeBreakdown = async () => {
      paymentCodeController.getPenaltyGroupBreakdownForType[0](req, res);
      await new Promise((resolve) => { setImmediate(resolve); });
    };
    await invokeBreakdown();
    await invokeBreakdown();
    await invokeBreakdown();
    sinon.assert.calledWith(res.render, 'payment/penaltyGroupTypeBreakdown', sinon.match({ paymentCode: 'synthetic' }));
    sinon.assert.calledWith(res.redirect, '/payment-code/synthetic');
    sinon.assert.calledWith(res.redirect, '/payment-code?invalidPaymentCode');
  });
});
