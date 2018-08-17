import { expect } from 'chai';
import sinon from 'sinon';

import * as PaymentController from '../../src/server/controllers/payment.controller';
import CpmsService from '../../src/server/services/cpms.service';
import PenaltyGroupService from '../../src/server/services/penaltyGroup.service';
import getPenaltyGroupFake from '../data/penaltyGroup/enchrichedPenaltyGroupFake';
import fakeEnrichedPenaltyGroups from '../data/penaltyGroup/fake-penalty-groups-enriched.json';
import PaymentService from '../../src/server/services/payment.service';

describe('PaymentController', () => {
  describe('renderGroupPaymentPage', () => {
    let penaltyGroupServiceStub;
    const redirectSpy = sinon.spy();
    const renderSpy = sinon.spy();
    const response = { render: renderSpy, redirect: redirectSpy };
    let request;

    beforeEach(() => {
      penaltyGroupServiceStub = sinon.stub(PenaltyGroupService.prototype, 'getByPaymentCode');
      penaltyGroupServiceStub
        .callsFake(code => getPenaltyGroupFake(code));
      request = {
        params: { payment_code: '5624r2wupfs', type: 'FPN' },
        query: { paymentType: 'card' },
        get: () => 'localhost',
      };
    });
    afterEach(() => {
      PenaltyGroupService.prototype.getByPaymentCode.restore();
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
        const penaltyGroup = fakeEnrichedPenaltyGroups
          .find(g => g.paymentCode === '5624r2wupfs');
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
  });

  describe('confirmGroupPayment', () => {
    let penaltyGrpServiceStub;
    let cpmsServiceStub;
    let paymentServiceStub;
    const redirectSpy = sinon.spy();
    const renderSpy = sinon.spy();
    const response = { render: renderSpy, redirect: redirectSpy };
    let request;

    beforeEach(() => {
      penaltyGrpServiceStub = sinon.stub(PenaltyGroupService.prototype, 'getByPaymentCode');
      cpmsServiceStub = sinon.stub(CpmsService.prototype, 'confirmPayment');
      paymentServiceStub = sinon.stub(PaymentService.prototype, 'recordGroupPayment');

      request = {
        params: { payment_code: '5624r2wupfs', type: 'FPN' },
        query: { receipt_reference: 'FB02-18-20180816-154021-D8245D1F' },
      };

      penaltyGrpServiceStub.callsFake(paymentCode => getPenaltyGroupFake(paymentCode));
      cpmsServiceStub
        .withArgs('FB02-18-20180816-154021-D8245D1F', 'FPN')
        .resolves({ data: { code: 801, auth_code: '1234' } });
    });
    afterEach(() => {
      PenaltyGroupService.prototype.getByPaymentCode.restore();
      CpmsService.prototype.confirmPayment.restore();
      PaymentService.prototype.recordGroupPayment.restore();
      redirectSpy.resetHistory();
      renderSpy.resetHistory();
    });

    context('given CPMS Service confirmation response has code 801', () => {
      it('should call payment service to create a group payment record and redirect to the receipt page', async () => {
        await PaymentController.confirmGroupPayment(request, response);
        sinon.assert.calledWith(penaltyGrpServiceStub, '5624r2wupfs');
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
});
