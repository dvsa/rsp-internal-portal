import sinon from 'sinon';

import PenaltyGroupService from '../../src/server/services/penaltyGroup.service';
import ReceiptController from '../../src/server/controllers/receipt.controller';
import PaymentService from '../../src/server/services/payment.service';

describe('ReceiptController', () => {
  let penaltyGroupSvc;
  let paymentSvc;

  const request = { params: { payment_code: 'abcdefghij1', type: 'FPN' } };
  let redirectSpy;
  let renderSpy;
  let response;
  const penaltyGroupSvcResp = {
    isPenaltyGroup: true,
  };

  const groupPaymentResp = {
    ID: 'abcdefghij1',
    Payments: {
      IM: {
        PaymentRef: 'RJF12345',
        AuthCode: '1234TBD',
        PaymentAmount: '80',
        PaymentDate: 1519300376,
        PaymentStatus: 'PAID',
      },
    },
  };
  beforeEach(() => {
    penaltyGroupSvc = sinon.stub(PenaltyGroupService.prototype, 'getByPaymentCode');
    penaltyGroupSvc
      .withArgs('abcdefghij1')
      .resolves(penaltyGroupSvcResp);
    paymentSvc = sinon.stub(PaymentService.prototype, 'getGroupPayment');
    paymentSvc
      .withArgs('abcdefghij1')
      .resolves({ data: groupPaymentResp });
    redirectSpy = sinon.spy();
    renderSpy = sinon.spy();
    response = { redirect: redirectSpy, render: renderSpy };
  });
  afterEach(() => {
    PenaltyGroupService.prototype.getByPaymentCode.restore();
    PaymentService.prototype.getGroupPayment.restore();
    redirectSpy.resetHistory();
    renderSpy.resetHistory();
  });

  describe('when PenaltyGroupService and PaymentService both return data for payment code', () => {
    it('should render the penalty group into the receipt view with payment details', async () => {
      await ReceiptController(request, response);
      sinon.assert.calledWith(renderSpy, 'payment/multiPaymentReceipt', {
        paymentType: 'FPN',
        paymentDetails: {
          ID: 'abcdefghij1',
          Payments: {
            IM: {
              PaymentRef: 'RJF12345',
              AuthCode: '1234TBD',
              PaymentAmount: '80',
              PaymentDate: 1519300376,
              FormattedDate: '22/02/2018',
              FormattedTime: '11:52',
              PaymentStatus: 'PAID',
            },
          },
        },
        ...penaltyGroupSvcResp,
      });
    });
  });

  describe('when payment type parameter is invalid', () => {
    it('should redirect to the invalid payment code page', async () => {
      const badRequest = { params: { payment_code: 'abcdefghij1', type: 'BAD' } };
      await ReceiptController(badRequest, response);
      sinon.assert.calledWith(redirectSpy, '/?invalidPaymentCode');
    });
  });

  describe('when PenaltyGroupService rejects on fetching by payment code', () => {
    beforeEach(() => {
      penaltyGroupSvc
        .withArgs('abcdefghij1')
        .rejects();
    });
    it('should redirect to the invalid payment code page', async () => {
      await ReceiptController(request, response);
      sinon.assert.calledWith(redirectSpy, '/?invalidPaymentCode');
    });
  });

  describe('when PaymentService rejects on fetching by payment code', () => {
    beforeEach(() => {
      paymentSvc
        .withArgs('abcdefghij1')
        .rejects();
    });
    it('should redirect to the invalid payment code page', async () => {
      await ReceiptController(request, response);
      sinon.assert.calledWith(redirectSpy, '/?invalidPaymentCode');
    });
  });
});
