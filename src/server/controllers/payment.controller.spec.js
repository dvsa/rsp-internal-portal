import sinon from 'sinon';

import * as PaymentController from './payment.controller';
import PenaltyGroupService from '../services/penaltyGroup.service';

describe('PaymentController', () => {
  describe('renderGroupPaymentPage', () => {
    let penaltyGroupServiceStub;
    const redirectSpy = sinon.spy();
    const renderSpy = sinon.spy();
    const response = { render: renderSpy, redirect: redirectSpy };

    beforeEach(() => {
      penaltyGroupServiceStub = sinon.stub(PenaltyGroupService.prototype, 'getByPaymentCode');
      penaltyGroupServiceStub
        .withArgs('1234567890123')
        .resolves({});
    });
    afterEach(() => {
      PenaltyGroupService.prototype.getByPaymentCode.restore();
    });

    context('when the penalties of that type are already paid', () => {
      beforeEach(() => {
        penaltyGroupServiceStub
          .withArgs('1234567890123')
          .resolves({ status: 'PAID' });
      });
      it('should redirect back to the payment code', async () => {
        const req = { params: { payment_code: '1234567890123', type: 'FPN' } };
        await PaymentController.renderGroupPaymentPage(req, response);
        sinon.assert.calledWith(redirectSpy, '/payment-code/1234567890123');
      });
    });
  });
});
