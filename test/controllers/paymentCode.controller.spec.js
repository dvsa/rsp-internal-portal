import sinon from 'sinon';

import * as PaymentCodeController from '../../src/server/controllers/paymentCode.controller';
import PenaltyService from '../../src/server/services/penalty.service';
import PenaltyGroupService from '../../src/server/services/penaltyGroup.service';

import fakePenaltyGroups from '../data/penaltyGroup/fake-penalty-groups-enriched.json';

describe('Payment Code Controller', () => {
  describe('getPenaltyDetails', () => {
    let penaltyService;
    let penaltyGroupService;
    const renderSpy = sinon.spy();
    const redirectSpy = sinon.spy();
    const response = { render: renderSpy, redirect: redirectSpy };

    const fakePenaltyGroup = fakePenaltyGroups[0];
    const fakePenaltyDetails = fakePenaltyGroup.penaltyDetails[0].penalties[0];

    beforeEach(() => {
      penaltyService = sinon.stub(PenaltyService.prototype, 'getByPaymentCode');
      penaltyService
        .withArgs(fakePenaltyDetails.paymentCode)
        .resolves(fakePenaltyDetails);

      penaltyGroupService = sinon.stub(PenaltyGroupService.prototype, 'getByPaymentCode');
      penaltyGroupService
        .withArgs(fakePenaltyGroup.paymentCode)
        .resolves(fakePenaltyGroup);
    });
    afterEach(() => {
      PenaltyService.prototype.getByPaymentCode.restore();
      PenaltyGroupService.prototype.getByPaymentCode.restore();
      renderSpy.resetHistory();
    });

    describe('when called with payment code of length 16', () => {
      it('should return the individual penalty returned from penalty service', async () => {
        await PaymentCodeController.getPenaltyDetails[1]({
          params: { payment_code: fakePenaltyDetails.paymentCode },
        }, response);
        sinon.assert.calledWith(renderSpy, 'penalty/penaltyDetails', fakePenaltyDetails);
      });
    });

    describe('when called with payment code less than 16 characters', () => {
      it('should return the penalty group from penalty group service', async () => {
        await PaymentCodeController.getPenaltyDetails[1]({
          params: { payment_code: fakePenaltyGroup.paymentCode },
        }, response);
        sinon.assert.calledWith(renderSpy, 'penalty/penaltyGroupSummary', {
          ...fakePenaltyGroup,
          location: fakePenaltyDetails.location,
        });
      });
    });

    describe('when called with a query parameter indicating cancellation failed', () => {
      it('should render the response with a flag to show the error', async () => {
        await PaymentCodeController.getPenaltyDetails[1]({
          params: { payment_code: fakePenaltyGroup.paymentCode }, query: { cancellation: 'failed' },
        }, response);
        sinon.assert.calledWith(renderSpy, 'penalty/penaltyGroupSummary', {
          ...fakePenaltyGroup,
          cancellationFailed: true,
          location: fakePenaltyDetails.location,
        });
      });
    });
  });

  describe('cancelPaymentCode', () => {
    let paymentCode;
    let request;
    const redirectSpy = sinon.spy();
    const response = { redirect: redirectSpy };
    context('given the payment code is for a multi penalty', () => {
      let penaltyGroupServiceStub;
      beforeEach(() => {
        paymentCode = '1234567890zz';
        request = { params: { payment_code: paymentCode } };
        penaltyGroupServiceStub = sinon.stub(PenaltyGroupService.prototype, 'cancel');
      });
      afterEach(() => {
        PenaltyGroupService.prototype.cancel.restore();
      });
      context('and the penalty group service cancellation is successful', () => {
        beforeEach(() => {
          penaltyGroupServiceStub
            .withArgs(paymentCode)
            .resolves();
        });
        it('should redirect back to the payment code', async () => {
          await PaymentCodeController.cancelPaymentCode(request, response);
          sinon.assert.calledWith(redirectSpy, '/payment-code/1234567890zz');
          sinon.assert.calledWith(penaltyGroupServiceStub, paymentCode);
        });
      });
      context('and the penalty group service cancellation fails', () => {
        beforeEach(() => {
          penaltyGroupServiceStub
            .withArgs(paymentCode)
            .rejects();
        });
        it('should redirect back to the payment code with a query param to indicate the failure', async () => {
          await PaymentCodeController.cancelPaymentCode(request, response);
          sinon.assert.calledWith(redirectSpy, '/payment-code/1234567890zz?cancellation=failed');
          sinon.assert.calledWith(penaltyGroupServiceStub, paymentCode);
        });
      });
    });
  });
});
