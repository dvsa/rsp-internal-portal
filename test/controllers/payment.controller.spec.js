import sinon from 'sinon';

import * as PaymentController from '../../src/server/controllers/payment.controller';
import CpmsService from '../../src/server/services/cpms.service';
import PenaltyGroupService from '../../src/server/services/penaltyGroup.service';
import getPenaltyGroupFake from '../data/penaltyGroup/enchrichedPenaltyGroupFake';
import fakeEnrichedPenaltyGroups from '../data/penaltyGroup/fake-penalty-groups-enriched.json';
import PaymentService from '../../src/server/services/payment.service';

const penaltyGroup = fakeEnrichedPenaltyGroups.find(g => g.paymentCode === '5624r2wupfs');

describe('PaymentController', () => {
  let penaltyGroupServiceStub;
  let paymentServiceStub;
  const redirectSpy = sinon.spy();
  const renderSpy = sinon.spy();
  let request;
  const response = { render: renderSpy, redirect: redirectSpy };

  beforeEach(() => {
    penaltyGroupServiceStub = sinon.stub(PenaltyGroupService.prototype, 'getByPaymentCode');
    penaltyGroupServiceStub.callsFake(getPenaltyGroupFake);
    paymentServiceStub = sinon.stub(PaymentService.prototype, 'recordGroupPayment');
  });
  afterEach(() => {
    PenaltyGroupService.prototype.getByPaymentCode.restore();
    PaymentService.prototype.recordGroupPayment.restore();
    redirectSpy.resetHistory();
    renderSpy.resetHistory();
  });

  describe('renderGroupPaymentPage', () => {
    beforeEach(() => {
      request = {
        params: { payment_code: '5624r2wupfs', type: 'FPN' },
        query: { paymentType: 'card' },
        get: () => 'localhost',
      };
    });

    context('when the penalties of that type are already paid', () => {
      beforeEach(() => {
        request.params.payment_code = '4724r2wujeg';
      });
      it('should redirect back to the payment code', async () => {
        await PaymentController.renderGroupPaymentPage(request, response);
        sinon.assert.calledWith(redirectSpy, '/payment-code/4724r2wujeg');
      });
    });

    context('when the payment type is card', () => {
      let cpmsServiceStub;
      beforeEach(() => {
        cpmsServiceStub = sinon.stub(CpmsService.prototype, 'createCardNotPresentGroupTransaction');
        cpmsServiceStub
          .withArgs(
            '5624r2wupfs',
            penaltyGroup.penaltyGroupDetails,
            'FPN',
            penaltyGroup.penaltyDetails[0].penalties,
            'https://localhost/payment-code/5624r2wupfs/FPN/confirmGroupPayment',
          )
          .resolves({ data: { gateway_url: 'https://cpms.url' } });
      });
      afterEach(() => {
        CpmsService.prototype.createCardNotPresentGroupTransaction.restore();
      });
      it('should create a group card not present transaction and redirect to CPMS', async () => {
        await PaymentController.renderGroupPaymentPage(request, response);
        sinon.assert.calledWith(redirectSpy, 'https://cpms.url');
      });
    });

    context('when the payment type is cash', () => {
      beforeEach(() => {
        request.query.paymentType = 'cash';
      });
      it('should render the cash group payment page', async () => {
        await PaymentController.renderGroupPaymentPage(request, response);
        sinon.assert.calledWith(renderSpy, 'payment/groupCash', { ...penaltyGroup, paymentPenaltyType: 'FPN' });
      });
    });

    context('when the payment type is cheque', () => {
      beforeEach(() => {
        request.query.paymentType = 'cheque';
      });
      it('should render the cheque group payment page', async () => {
        await PaymentController.renderGroupPaymentPage(request, response);
        sinon.assert.calledWith(renderSpy, 'payment/groupCheque', { ...penaltyGroup, paymentPenaltyType: 'FPN' });
      });
    });

    context('when the payment type is cheque', () => {
      beforeEach(() => {
        request.query.paymentType = 'postal';
      });
      it('should render the postal order group payment page', async () => {
        await PaymentController.renderGroupPaymentPage(request, response);
        sinon.assert.calledWith(renderSpy, 'payment/groupPostalOrder', { ...penaltyGroup, paymentPenaltyType: 'FPN' });
      });
    });

    context('when the payment type is invalid', () => {
      beforeEach(() => {
        request.query.paymentType = 'notvalidtype';
      });
      it('should redirect to invalid payment code error page', async () => {
        await PaymentController.renderGroupPaymentPage(request, response);
        sinon.assert.calledWith(redirectSpy, '/?invalidPaymentCode');
      });
    });
  });

  describe('confirmGroupPayment', () => {
    let cpmsServiceStub;

    beforeEach(() => {
      cpmsServiceStub = sinon.stub(CpmsService.prototype, 'confirmPayment');

      request = {
        params: { payment_code: '5624r2wupfs', type: 'FPN' },
        query: { receipt_reference: 'FB02-18-20180816-154021-D8245D1F' },
      };

      cpmsServiceStub
        .withArgs('FB02-18-20180816-154021-D8245D1F', 'FPN')
        .resolves({ data: { code: 801, auth_code: '1234' } });
    });
    afterEach(() => {
      CpmsService.prototype.confirmPayment.restore();
    });

    context('given CPMS Service confirmation response has code 801', () => {
      it('should call payment service to create a group payment record and redirect to the receipt page', async () => {
        await PaymentController.confirmGroupPayment(request, response);
        sinon.assert.calledWith(penaltyGroupServiceStub, '5624r2wupfs');
        sinon.assert.calledWith(cpmsServiceStub, 'FB02-18-20180816-154021-D8245D1F', 'FPN');
        sinon.assert.calledWith(paymentServiceStub, {
          PaymentCode: '5624r2wupfs',
          PenaltyType: 'FPN',
          PaymentDetail: {
            PaymentMethod: 'CNP',
            PaymentRef: 'FB02-18-20180816-154021-D8245D1F',
            AuthCode: '1234',
            PaymentAmount: 120,
            PaymentDate: sinon.match.number,
          },
          PenaltyIds: [
            '564548184556_FPN',
            '5281756140484_FPN',
          ],
        });
        sinon.assert.calledWith(redirectSpy, '/payment-code/5624r2wupfs/FPN/receipt');
      });
    });

    context('given CPMS Service confirmation response has a code different from 801', () => {
      beforeEach(() => {
        cpmsServiceStub
          .withArgs('FB02-18-20180816-154021-D8245D1F', 'FPN')
          .resolves({ data: { code: 999, auth_code: '1234' } });
      });
      it('should render to failed payment page', async () => {
        await PaymentController.confirmGroupPayment(request, response);
        sinon.assert.calledWith(renderSpy, 'payment/failedPayment');
      });
    });

    context('given collaborator rejects', () => {
      beforeEach(() => {
        cpmsServiceStub.reset();
        cpmsServiceStub.rejects();
      });
      it('should render the failed payment page', async () => {
        await PaymentController.confirmGroupPayment(request, response);
        sinon.assert.calledWith(renderSpy, 'payment/failedPayment');
      });
    });
  });

  describe('makeGroupPayment', () => {
    let cpmsSvcMock;
    const standardTransactionPayloadWithExtraArgsResolvesSuccess = (a, ...rest) => { // eslint-disable-line
      return cpmsSvcMock.withArgs(
        '5624r2wupfs',
        penaltyGroup.penaltyGroupDetails,
        'FPN',
        penaltyGroup.penaltyDetails,
        'https://localhost/payment-code/5624r2wupfs/FPN/receipt',
        ...rest,
      )
        .resolves({
          data: {
            receipt_reference: 'receipt-ref',
            code: '000',
            message: 'Success',
          },
        });
    };

    context('when a cash payment is sent', async () => {
      beforeEach(() => {
        cpmsSvcMock = sinon.stub(CpmsService.prototype, 'createGroupCashTransaction');
        standardTransactionPayloadWithExtraArgsResolvesSuccess(cpmsSvcMock, '1234');
        request = {
          body: { paymentType: 'cash', slipNumber: '1234' },
          params: { payment_code: '5624r2wupfs', type: 'FPN' },
          get: () => 'localhost',
        };
      });
      afterEach(() => {
        CpmsService.prototype.createGroupCashTransaction.restore();
      });
      it('should create a group cash transaction, make a group payment and return to the receipt page', async () => {
        await PaymentController.makeGroupPayment(request, response);
        sinon.assert.calledWith(paymentServiceStub, {
          PaymentCode: '5624r2wupfs',
          PenaltyType: 'FPN',
          PaymentDetail: {
            PaymentMethod: 'CASH',
            PaymentRef: 'receipt-ref',
            PaymentAmount: 120,
            PaymentDate: sinon.match.number,
          },
          PenaltyIds: [
            '564548184556_FPN',
            '5281756140484_FPN',
          ],
        });
        sinon.assert.calledWith(redirectSpy, '/payment-code/5624r2wupfs/FPN/receipt');
      });

      context('given CPMS orchestration does not indicate the cash payment was successful', () => {
        beforeEach(() => {
          cpmsSvcMock.resetBehavior();
          cpmsSvcMock.resolves({
            data: {
              receipt_reference: 'receipt-ref',
              code: '001',
              message: 'Not success',
            },
          });
        });

        it('should render the failed payment page', async () => {
          await PaymentController.makeGroupPayment(request, response);
          sinon.assert.calledWith(renderSpy, 'payment/failedPayment');
        });
      });
    });

    context('when a cheque payment is sent', () => {
      beforeEach(() => {
        cpmsSvcMock = sinon.stub(CpmsService.prototype, 'createGroupChequeTransaction');
        standardTransactionPayloadWithExtraArgsResolvesSuccess(cpmsSvcMock, '1234');
        request.body.paymentType = 'cheque';
      });
      afterEach(() => {
        CpmsService.prototype.createGroupChequeTransaction.restore();
      });
      it('should create a group cheque transaction, make a group payment and return to the receipt page', async () => {
        await PaymentController.makeGroupPayment(request, response);
        sinon.assert.calledWith(paymentServiceStub, {
          PaymentCode: '5624r2wupfs',
          PenaltyType: 'FPN',
          PaymentDetail: {
            PaymentMethod: 'CHEQUE',
            PaymentRef: 'receipt-ref',
            PaymentAmount: 120,
            PaymentDate: sinon.match.number,
          },
          PenaltyIds: [
            '564548184556_FPN',
            '5281756140484_FPN',
          ],
        });
        sinon.assert.calledWith(redirectSpy, '/payment-code/5624r2wupfs/FPN/receipt');
      });
    });

    context('when a postal payment is sent', () => {
      beforeEach(() => {
        cpmsSvcMock = sinon.stub(CpmsService.prototype, 'createGroupPostalOrderTransaction');
        standardTransactionPayloadWithExtraArgsResolvesSuccess(cpmsSvcMock, '1234', '2468');
        request.body.paymentType = 'postal';
        request.body.slipNumber = '1234';
        request.body.postalOrderNumber = '2468';
      });
      afterEach(() => {
        CpmsService.prototype.createGroupPostalOrderTransaction.restore();
      });
      it('should create a group postal order transaction, make a group payment and return to the receipt page', async () => {
        await PaymentController.makeGroupPayment(request, response);
        sinon.assert.calledWith(paymentServiceStub, {
          PaymentCode: '5624r2wupfs',
          PenaltyType: 'FPN',
          PaymentDetail: {
            PaymentMethod: 'POSTAL_ORDER',
            PaymentRef: 'receipt-ref',
            PaymentAmount: 120,
            PaymentDate: sinon.match.number,
          },
          PenaltyIds: [
            '564548184556_FPN',
            '5281756140484_FPN',
          ],
        });
        sinon.assert.calledWith(redirectSpy, '/payment-code/5624r2wupfs/FPN/receipt');
      });
    });
  });
});
