import sinon from 'sinon';
import * as PaymentController from '../../src/server/controllers/payment.controller';
import PenaltyService from '../../src/server/services/penalty.service';
import PaymentService from '../../src/server/services/payment.service';
import CpmsService from '../../src/server/services/cpms.service';
import config from '../../src/server/config';

describe('payment reversal', () => {
  let req;
  let res;
  let penalty;
  let payments;
  let reverseCard;
  let reverseCheque;

  beforeEach(() => {
    sinon.stub(config, 'urlRoot').returns('');
    req = {
      params: { payment_code: 'synthetic', type: 'FPN' },
      session: { rsp_user: { email: 'synthetic@example.test' }, rsp_user_role: 'BankingFinance' },
    };
    res = { redirect: sinon.spy(), render: sinon.spy() };
    penalty = sinon.stub(PenaltyService.prototype, 'getByPaymentCode');
    payments = sinon.stub(PaymentService.prototype, 'reversePayment').resolves();
    reverseCard = sinon.stub(CpmsService.prototype, 'reverseCardPayment').resolves();
    reverseCheque = sinon.stub(CpmsService.prototype, 'reverseChequePayment').resolves();
  });
  afterEach(() => sinon.restore());

  function paidPenalty(paymentMethod) {
    return {
      reference: '123',
      type: 'FPN',
      paymentRef: 'receipt',
      paymentCode: 'synthetic',
      paymentMethod,
      status: 'PAID',
    };
  }

  ['CARD', 'CNP', 'CHEQUE', 'CASH'].forEach((method) => {
    it(`reverses an individual ${method} payment`, async () => {
      penalty.resolves(paidPenalty(method));
      await PaymentController.reversePayment(req, res);
      sinon.assert.calledWithExactly(payments, '123_FPN');
      if (['CARD', 'CNP'].includes(method)) sinon.assert.calledWithExactly(reverseCard, 'receipt', 'FPN', 'synthetic');
      if (method === 'CHEQUE') sinon.assert.calledWithExactly(reverseCheque, 'receipt', 'FPN', 'synthetic');
      if (method === 'CASH') {
        sinon.assert.notCalled(reverseCard);
        sinon.assert.notCalled(reverseCheque);
      }
      sinon.assert.calledWith(res.redirect, '/payment-code/synthetic');
    });
  });

  it('does not reverse unpaid or unrecognised payments', async () => {
    penalty.onFirstCall().resolves({ ...paidPenalty('CARD'), status: 'UNPAID' });
    penalty.onSecondCall().resolves(paidPenalty('OTHER'));
    await PaymentController.reversePayment(req, res);
    await PaymentController.reversePayment(req, res);
    sinon.assert.notCalled(payments);
    sinon.assert.notCalled(reverseCard);
  });

  it('reports CPMS and payment service failures', async () => {
    penalty.resolves(paidPenalty('CARD'));
    reverseCard.onFirstCall().rejects(new Error('synthetic failure'));
    payments.rejects(new Error('synthetic failure'));
    await PaymentController.reversePayment(req, res);
    sinon.assert.notCalled(payments);
    await PaymentController.reversePayment(req, res);
    sinon.assert.calledTwice(res.redirect);
    sinon.assert.alwaysCalledWith(res.redirect, '/payment-code/synthetic?reverse=failed');
  });

  it('redirects if the penalty cannot be found', async () => {
    penalty.rejects(new Error('synthetic failure'));
    await PaymentController.reversePayment(req, res);
    sinon.assert.calledWith(res.redirect, '/?invalidPaymentCode');
    sinon.assert.notCalled(payments);
  });

  ['CARD', 'CHEQUE', 'CASH'].forEach((method) => {
    it(`reverses a grouped ${method} payment`, async () => {
      sinon.stub(PaymentService.prototype, 'getGroupPayment').resolves({
        data: { Payments: { FPN: { PaymentMethod: method, PaymentRef: 'receipt' } } },
      });
      const reverse = sinon.stub(PaymentService.prototype, 'reverseGroupPayment').resolves();
      await PaymentController.reverseGroupPayment(req, res);
      sinon.assert.calledWithExactly(reverse, 'synthetic', 'FPN');
      if (method === 'CARD') sinon.assert.calledWithExactly(reverseCard, 'receipt', 'FPN', 'synthetic');
      if (method === 'CHEQUE') sinon.assert.calledWithExactly(reverseCheque, 'receipt', 'FPN', 'synthetic');
      sinon.assert.calledWith(res.redirect, '/payment-code/synthetic');
    });
  });

  it('does not reverse a group with an unrecognised method', async () => {
    sinon.stub(PaymentService.prototype, 'getGroupPayment').resolves({
      data: { Payments: { FPN: { PaymentMethod: 'OTHER' } } },
    });
    const reverse = sinon.stub(PaymentService.prototype, 'reverseGroupPayment');
    await PaymentController.reverseGroupPayment(req, res);
    sinon.assert.notCalled(reverse);
    sinon.assert.notCalled(reverseCard);
  });

  it('reports group lookup, CPMS and payment service failures', async () => {
    const get = sinon.stub(PaymentService.prototype, 'getGroupPayment');
    get.onFirstCall().rejects(new Error('synthetic failure'));
    get.resolves({ data: { Payments: { FPN: { PaymentMethod: 'CARD', PaymentRef: 'receipt' } } } });
    const reverse = sinon.stub(PaymentService.prototype, 'reverseGroupPayment').rejects(new Error('synthetic failure'));
    reverseCard.onFirstCall().rejects(new Error('synthetic failure'));
    await PaymentController.reverseGroupPayment(req, res);
    sinon.assert.calledWith(res.redirect, '/?invalidPaymentCode');
    await PaymentController.reverseGroupPayment(req, res);
    sinon.assert.notCalled(reverse);
    await PaymentController.reverseGroupPayment(req, res);
    sinon.assert.calledOnce(reverse);
    sinon.assert.calledWith(res.redirect, '/payment-code/synthetic?reverse=failed');
  });
});
