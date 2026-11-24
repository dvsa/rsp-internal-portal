import sinon from 'sinon';
import * as PaymentController from '../../src/server/controllers/payment.controller';
import PenaltyService from '../../src/server/services/penalty.service';
import CpmsService from '../../src/server/services/cpms.service';
import config from '../../src/server/config';

describe('individual payment page', () => {
  let req;
  let res;
  let getPenalty;
  const penalty = {
    paymentCode: 'synthetic',
    formattedReference: '123',
    vehicleReg: 'AB12CDE',
    type: 'FPN',
    amount: 100,
    status: 'UNPAID',
    isPaymentOverdue: false,
  };

  beforeEach(() => {
    sinon.stub(config, 'urlRoot').returns('');
    sinon.stub(config, 'postPaymentRedirectBaseUrl').returns('https://portal.example.test');
    getPenalty = sinon.stub(PenaltyService.prototype, 'getByPaymentCode').resolves(penalty);
    req = { params: { payment_code: 'synthetic' }, query: {}, session: {} };
    res = { render: sinon.spy(), redirect: sinon.spy() };
  });
  afterEach(() => sinon.restore());

  ['cash', 'cheque', 'postal'].forEach((method) => {
    it(`renders the ${method} form`, async () => {
      req.query = { paymentType: method, invalidSlipNumber: '' };
      await PaymentController.renderPaymentPage(req, res);
      sinon.assert.calledWith(res.render, `payment/${method}`, sinon.match({
        paymentCode: 'synthetic', invalidSlipNumber: true,
      }));
    });
  });

  it('creates a card transaction and redirects to its gateway', async () => {
    const create = sinon.stub(CpmsService.prototype, 'createCardNotPresentTransaction')
      .resolves({ data: { gateway_url: 'https://gateway.example.test' } });
    await PaymentController.renderPaymentPage(req, res);
    sinon.assert.calledWithExactly(
      create,
      'synthetic',
      'AB12CDE',
      '123',
      'FPN',
      100,
      'https://portal.example.test/payment-code/synthetic/confirmPayment',
    );
    sinon.assert.calledWith(res.redirect, 'https://gateway.example.test');
  });

  it('redirects to the payment code if card creation fails or the payment is overdue', async () => {
    sinon.stub(CpmsService.prototype, 'createCardNotPresentTransaction').rejects(new Error('synthetic failure'));
    await PaymentController.renderPaymentPage(req, res);
    getPenalty.resolves({ ...penalty, isPaymentOverdue: true });
    await PaymentController.renderPaymentPage(req, res);
    sinon.assert.calledTwice(res.redirect);
    sinon.assert.alwaysCalledWith(res.redirect, '/payment-code/synthetic');
  });

  it('looks up a penalty by ID when no payment code is supplied', async () => {
    req.params = { penalty_id: 'synthetic-id' };
    req.query.paymentType = 'cash';
    const getById = sinon.stub(PenaltyService.prototype, 'getById').resolves(penalty);
    await PaymentController.renderPaymentPage(req, res);
    sinon.assert.calledOnceWithExactly(getById, 'synthetic-id');
    sinon.assert.notCalled(getPenalty);
    sinon.assert.calledWith(res.render, 'payment/cash', sinon.match({ paymentCode: 'synthetic' }));
  });

  ['cheque', 'postal'].forEach((method) => {
    it(`does not render a ${method} form for an immobilisation penalty`, async () => {
      req.query.paymentType = method;
      getPenalty.resolves({ ...penalty, type: 'IM' });
      const create = sinon.stub(CpmsService.prototype, 'createCardNotPresentTransaction');
      await PaymentController.renderPaymentPage(req, res);
      sinon.assert.notCalled(res.render);
      sinon.assert.notCalled(create);
      sinon.assert.calledOnceWithExactly(res.redirect, '/payment-code/synthetic');
    });
  });

  it('redirects when the penalty lookup fails', async () => {
    getPenalty.rejects(new Error('synthetic failure'));
    const create = sinon.stub(CpmsService.prototype, 'createCardNotPresentTransaction');
    await PaymentController.renderPaymentPage(req, res);
    sinon.assert.notCalled(create);
    sinon.assert.calledOnceWithExactly(res.redirect, '/?invalidPaymentCode');
  });
});
