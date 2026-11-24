import sinon from 'sinon';
import * as PaymentController from '../../src/server/controllers/payment.controller';
import CpmsService from '../../src/server/services/cpms.service';
import PenaltyService from '../../src/server/services/penalty.service';
import PaymentService from '../../src/server/services/payment.service';
import config from '../../src/server/config';

describe('individual payment confirmation', () => {
  let req;
  let res;
  let penalty;
  let confirm;
  let record;
  const details = {
    paymentCode: 'synthetic', reference: '123', type: 'FPN', amount: 100,
  };

  beforeEach(() => {
    sinon.stub(config, 'urlRoot').returns('');
    req = { params: { payment_code: 'synthetic' }, query: { receipt_reference: 'receipt' }, session: {} };
    res = { render: sinon.spy(), redirect: sinon.spy() };
    penalty = sinon.stub(PenaltyService.prototype, 'getByPaymentCode').resolves(details);
    confirm = sinon.stub(CpmsService.prototype, 'confirmPayment');
    record = sinon.stub(PaymentService.prototype, 'makePayment');
  });
  afterEach(() => sinon.restore());

  async function runConfirmation() {
    await PaymentController.confirmPayment(req, res);
    await new Promise((resolve) => { setImmediate(resolve); });
  }

  it('records a confirmed card payment', async () => {
    confirm.resolves({ data: { code: 801, receipt_reference: 'receipt', auth_code: 'synthetic' } });
    record.resolves();
    await runConfirmation();
    sinon.assert.calledWithExactly(confirm, 'receipt', 'FPN');
    sinon.assert.calledWith(record, sinon.match({
      PenaltyStatus: 'PAID',
      PenaltyType: 'FPN',
      PenaltyReference: '123',
      PaymentDetail: sinon.match({
        PaymentMethod: 'CNP', PaymentRef: 'receipt', AuthCode: 'synthetic', PaymentAmount: 100,
      }),
    }));
    sinon.assert.calledWith(res.redirect, '/payment-code/synthetic');
  });

  it('redirects even if recording a confirmed payment fails', async () => {
    confirm.resolves({ data: { code: 801 } });
    record.rejects(new Error('synthetic failure'));
    await runConfirmation();
    sinon.assert.calledWith(res.redirect, '/payment-code/synthetic');
  });

  it('renders failure when confirmation is rejected or unsuccessful', async () => {
    confirm.onFirstCall().resolves({ data: { code: 500 } });
    confirm.onSecondCall().rejects(new Error('synthetic failure'));
    await runConfirmation();
    await runConfirmation();
    sinon.assert.calledTwice(res.render);
    sinon.assert.alwaysCalledWith(res.render, 'payment/failedPayment', req.session);
    sinon.assert.notCalled(record);
  });

  it('redirects when the penalty lookup fails', async () => {
    penalty.rejects(new Error('synthetic failure'));
    await runConfirmation();
    sinon.assert.calledWith(res.redirect, '/?invalidPaymentCode');
    sinon.assert.notCalled(confirm);
  });
});
