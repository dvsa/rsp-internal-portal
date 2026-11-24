import sinon from 'sinon';
import * as PaymentController from '../../src/server/controllers/payment.controller';
import PenaltyService from '../../src/server/services/penalty.service';
import PaymentService from '../../src/server/services/payment.service';
import CpmsService from '../../src/server/services/cpms.service';
import config from '../../src/server/config';

describe('individual cheque and postal payments', () => {
  let req;
  let res;
  let record;
  let getPenalty;
  const penalty = {
    paymentCode: 'synthetic',
    reference: '123',
    formattedReference: '123',
    vehicleReg: 'AB12CDE',
    type: 'FPN',
    amount: 100,
  };

  beforeEach(() => {
    sinon.stub(config, 'urlRoot').returns('');
    sinon.stub(config, 'doRoleChecks').returns(true);
    getPenalty = sinon.stub(PenaltyService.prototype, 'getByPaymentCode').resolves(penalty);
    record = sinon.stub(PaymentService.prototype, 'makePayment').resolves();
    req = {
      params: { payment_code: 'synthetic' },
      session: { rsp_user_role: 'BankingFinance', rsp_user: { email: 'synthetic@example.test' } },
      body: { slipNumber: '123' },
    };
    res = { render: sinon.spy(), redirect: sinon.spy() };
  });

  afterEach(() => sinon.restore());

  ['cheque', 'postal'].forEach((method) => {
    it(`records a successful ${method} payment`, async () => {
      req.body.paymentType = method;
      const create = sinon.stub(CpmsService.prototype, method === 'cheque' ? 'createChequeTransaction' : 'createPostalOrderTransaction')
        .resolves({ data: { receipt_reference: 'synthetic-receipt' } });
      await PaymentController.makePayment(req, res);
      await new Promise((resolve) => { setImmediate(resolve); });
      sinon.assert.calledOnce(create);
      sinon.assert.calledWith(record, sinon.match({
        PenaltyReference: '123',
        PaymentDetail: sinon.match({ PaymentMethod: method.toUpperCase(), PaymentRef: 'synthetic-receipt' }),
      }));
      sinon.assert.calledWith(res.redirect, '/payment-code/synthetic');
    });

    it(`redirects without recording when ${method} payment creation fails`, async () => {
      req.body.paymentType = method;
      sinon.stub(CpmsService.prototype, method === 'cheque' ? 'createChequeTransaction' : 'createPostalOrderTransaction')
        .rejects(new Error('synthetic failure'));
      await PaymentController.makePayment(req, res);
      sinon.assert.notCalled(record);
      sinon.assert.calledWith(res.redirect, '/payment-code/synthetic');
    });
  });

  it('forbids cheque payments for frontline users', async () => {
    req.body.paymentType = 'cheque';
    req.session.rsp_user_role = 'FrontLine';
    const create = sinon.stub(CpmsService.prototype, 'createChequeTransaction');
    await PaymentController.makePayment(req, res);
    sinon.assert.notCalled(create);
    sinon.assert.notCalled(record);
    sinon.assert.calledWith(res.render, 'main/forbidden', req.session);
  });

  it('rejects a missing payment type without looking up or recording a payment', async () => {
    await PaymentController.makePayment(req, res);
    sinon.assert.notCalled(getPenalty);
    sinon.assert.notCalled(record);
    sinon.assert.calledOnceWithExactly(res.redirect, '/payment-code/synthetic');
  });

  ['slipNumber', 'chequeNumber', 'postalOrderNumber'].forEach((field) => {
    it(`rejects a non-numeric ${field} without creating a transaction`, async () => {
      req.body = { paymentType: 'cheque', [field]: 'not-a-number' };
      req.protocol = 'https';
      req.get = sinon.stub().withArgs('host').returns('portal.example.test');
      req.originalUrl = '/payment-code/synthetic/payment?paymentType=cheque';
      const create = sinon.stub(CpmsService.prototype, 'createChequeTransaction');

      await PaymentController.makePayment(req, res);

      sinon.assert.notCalled(create);
      sinon.assert.notCalled(record);
      sinon.assert.calledOnceWithExactly(res.redirect, 'https://portal.example.test/payment-code/synthetic/payment?paymentType=cheque&invalidSlipNumber');
    });
  });

  it('does not duplicate the invalid input marker on a retry', async () => {
    req.body = { paymentType: 'cash', slipNumber: 'invalid' };
    req.protocol = 'https';
    req.get = sinon.stub().withArgs('host').returns('portal.example.test');
    req.originalUrl = '/payment-code/synthetic/payment?paymentType=cash&invalidSlipNumber';
    const create = sinon.stub(CpmsService.prototype, 'createCashTransaction');

    await PaymentController.makePayment(req, res);

    sinon.assert.notCalled(create);
    sinon.assert.notCalled(record);
    sinon.assert.calledOnceWithExactly(res.redirect, 'https://portal.example.test/payment-code/synthetic/payment?paymentType=cash&invalidSlipNumber');
  });

  it('rejects cheque payments when none of the user roles is authorised', async () => {
    req.body.paymentType = 'cheque';
    req.session.rsp_user_role = ['FrontLine', 'Admin'];
    const create = sinon.stub(CpmsService.prototype, 'createChequeTransaction');

    await PaymentController.makePayment(req, res);

    sinon.assert.notCalled(create);
    sinon.assert.notCalled(record);
    sinon.assert.calledOnceWithExactly(res.render, 'main/forbidden', req.session);
  });

  it('allows cheque payments when one of the user roles is authorised', async () => {
    req.body.paymentType = 'cheque';
    req.session.rsp_user_role = ['FrontLine', 'ContactCentre'];
    const create = sinon.stub(CpmsService.prototype, 'createChequeTransaction')
      .resolves({ data: { receipt_reference: 'synthetic-receipt' } });

    await PaymentController.makePayment(req, res);
    await new Promise((resolve) => { setImmediate(resolve); });

    sinon.assert.calledOnce(create);
    sinon.assert.calledOnce(record);
    sinon.assert.calledOnceWithExactly(res.redirect, '/payment-code/synthetic');
  });

  ['cash', 'cheque', 'postal'].forEach((method) => {
    it(`redirects if recording a created ${method} transaction fails`, async () => {
      req.body.paymentType = method;
      const createMethod = {
        cash: 'createCashTransaction',
        cheque: 'createChequeTransaction',
        postal: 'createPostalOrderTransaction',
      }[method];
      const create = sinon.stub(CpmsService.prototype, createMethod)
        .resolves({ data: { receipt_reference: 'synthetic-receipt' } });
      record.rejects(new Error('synthetic failure'));

      await PaymentController.makePayment(req, res);
      await new Promise((resolve) => { setImmediate(resolve); });

      sinon.assert.calledOnce(create);
      sinon.assert.calledOnce(record);
      sinon.assert.calledOnceWithExactly(res.redirect, '/payment-code/synthetic');
    });
  });

  it('redirects without recording when cash transaction creation fails', async () => {
    req.body.paymentType = 'cash';
    sinon.stub(CpmsService.prototype, 'createCashTransaction').rejects(new Error('synthetic failure'));
    await PaymentController.makePayment(req, res);
    sinon.assert.notCalled(record);
    sinon.assert.calledOnceWithExactly(res.redirect, '/payment-code/synthetic');
  });

  it('redirects without recording for an unknown payment type', async () => {
    req.body.paymentType = 'unknown';
    const create = sinon.stub(CpmsService.prototype, 'createCashTransaction');
    await PaymentController.makePayment(req, res);
    sinon.assert.notCalled(create);
    sinon.assert.notCalled(record);
    sinon.assert.calledOnceWithExactly(res.redirect, '/payment-code/synthetic');
  });

  it('redirects without recording when the penalty lookup fails', async () => {
    req.body.paymentType = 'cash';
    getPenalty.rejects(new Error('synthetic failure'));
    const create = sinon.stub(CpmsService.prototype, 'createCashTransaction');
    await PaymentController.makePayment(req, res);
    sinon.assert.notCalled(create);
    sinon.assert.notCalled(record);
    sinon.assert.calledOnceWithExactly(res.redirect, '/?invalidPaymentCode');
  });
});
