import sinon from 'sinon';
import * as PaymentController from '../../src/server/controllers/payment.controller';
import PenaltyGroupService from '../../src/server/services/penaltyGroup.service';
import PaymentService from '../../src/server/services/payment.service';
import CpmsService from '../../src/server/services/cpms.service';
import config from '../../src/server/config';

describe('group payment failure paths', () => {
  let req;
  let res;
  let getGroup;
  let create;
  let record;
  const group = {
    paymentCode: 'synthetic',
    paymentStatus: 'UNPAID',
    penaltyGroupDetails: {
      isPaymentOverdue: false,
      splitAmounts: [{ type: 'FPN', amount: 100 }],
    },
    penaltyDetails: [{ type: 'FPN', penalties: [{ reference: '123' }] }],
  };

  beforeEach(() => {
    sinon.stub(config, 'urlRoot').returns('');
    sinon.stub(config, 'postPaymentRedirectBaseUrl').returns('https://portal.example.test');
    getGroup = sinon.stub(PenaltyGroupService.prototype, 'getByPaymentCode').resolves(group);
    create = sinon.stub(CpmsService.prototype, 'createGroupCashTransaction')
      .resolves({ data: { code: '000', receipt_reference: 'synthetic-receipt' } });
    record = sinon.stub(PaymentService.prototype, 'recordGroupPayment').resolves();
    req = {
      params: { payment_code: 'synthetic', type: 'FPN' },
      body: { paymentType: 'cash', slipNumber: '123' },
      query: { paymentType: 'cash' },
      session: {},
    };
    res = { render: sinon.spy(), redirect: sinon.spy() };
  });
  afterEach(() => sinon.restore());

  ['cheque', 'postal'].forEach((method) => {
    it(`rejects grouped ${method} payments for immobilisation before looking up the group`, async () => {
      req.params.type = 'IM';
      req.body.paymentType = method;
      const createInvalid = sinon.stub(CpmsService.prototype, method === 'cheque'
        ? 'createGroupChequeTransaction' : 'createGroupPostalOrderTransaction');

      await PaymentController.makeGroupPayment(req, res);

      sinon.assert.notCalled(getGroup);
      sinon.assert.notCalled(createInvalid);
      sinon.assert.notCalled(record);
      sinon.assert.calledOnceWithExactly(res.redirect, '/payment-code/synthetic');
    });

    it(`does not render a grouped ${method} form for immobilisation`, async () => {
      req.params.type = 'IM';
      req.query.paymentType = method;

      await PaymentController.renderGroupPaymentPage(req, res);

      sinon.assert.notCalled(res.render);
      sinon.assert.calledOnceWithExactly(res.redirect, '/payment-code/synthetic/IM/details');
    });
  });

  it('does not render a form for an overdue group', async () => {
    getGroup.resolves({
      ...group,
      penaltyGroupDetails: { ...group.penaltyGroupDetails, isPaymentOverdue: true },
    });

    await PaymentController.renderGroupPaymentPage(req, res);

    sinon.assert.notCalled(res.render);
    sinon.assert.notCalled(create);
    sinon.assert.calledOnceWithExactly(res.redirect, '/payment-code/synthetic');
  });

  it('does not record a group payment if CPMS rejects the transaction', async () => {
    create.resolves({ data: { code: '999' } });

    await PaymentController.makeGroupPayment(req, res);

    sinon.assert.calledOnce(create);
    sinon.assert.notCalled(record);
    sinon.assert.calledOnceWithExactly(res.render, 'payment/failedPayment', req.session);
    sinon.assert.notCalled(res.redirect);
  });

  it('redirects without recording when transaction creation fails', async () => {
    create.rejects(new Error('synthetic failure'));

    await PaymentController.makeGroupPayment(req, res);

    sinon.assert.calledOnce(create);
    sinon.assert.notCalled(record);
    sinon.assert.calledOnceWithExactly(res.redirect, '/payment-code/synthetic');
  });

  it('redirects if recording a created group transaction fails', async () => {
    record.rejects(new Error('synthetic failure'));

    await PaymentController.makeGroupPayment(req, res);

    sinon.assert.calledOnce(create);
    sinon.assert.calledOnce(record);
    sinon.assert.calledOnceWithExactly(res.redirect, '/payment-code/synthetic');
  });

  it('does not create or record a payment when the group lookup fails', async () => {
    getGroup.rejects(new Error('synthetic failure'));

    await PaymentController.makeGroupPayment(req, res);

    sinon.assert.notCalled(create);
    sinon.assert.notCalled(record);
    sinon.assert.calledOnceWithExactly(res.redirect, '/payment-code/synthetic');
  });

  it('does not create or record a payment for an unknown payment type', async () => {
    req.body.paymentType = 'unknown';

    await PaymentController.makeGroupPayment(req, res);

    sinon.assert.notCalled(create);
    sinon.assert.notCalled(record);
    sinon.assert.calledOnceWithExactly(res.redirect, '/payment-code/synthetic');
  });
});
