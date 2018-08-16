import sinon from 'sinon';

import * as PaymentCodeController from '../../src/server/controllers/paymentCode.controller';
import PenaltyService from '../../src/server/services/penalty.service';
import PenaltyGroupService from '../../src/server/services/penaltyGroup.service';

describe('Payment Code Controller', () => {
  describe('getPenaltyDetails', () => {
    let penaltyService;
    let penaltyGroupService;
    const renderSpy = sinon.spy();
    const redirectSpy = sinon.spy();
    const response = { render: renderSpy, redirect: redirectSpy };

    const fakePenaltyDetails = { paymentCode: '1234567890123456' };
    const fakePenaltyGroup = { isPenaltyGroup: true };

    beforeEach(() => {
      penaltyService = sinon.stub(PenaltyService.prototype, 'getByPaymentCode');
      penaltyService
        .withArgs('1234567890123456')
        .resolves(fakePenaltyDetails);

      penaltyGroupService = sinon.stub(PenaltyGroupService.prototype, 'getByPaymentCode');
      penaltyGroupService
        .withArgs('notlength16')
        .resolves(fakePenaltyGroup);
    });
    afterEach(() => {
      PenaltyService.prototype.getByPaymentCode.restore();
      PenaltyGroupService.prototype.getByPaymentCode.restore();
      renderSpy.resetHistory();
    });

    describe('when called with payment code of length 16', () => {
      it('should return the individual penalty returned from penalty service', async () => {
        await PaymentCodeController.getPenaltyDetails[1]({ params: { payment_code: '1234567890123456' } }, response);
        sinon.assert.calledWith(renderSpy, 'penalty/penaltyDetails', fakePenaltyDetails);
      });
    });

    describe('when called with payment code less than 16 characters', () => {
      it('should return the penalty group from penalty group service', async () => {
        await PaymentCodeController.getPenaltyDetails[1]({ params: { payment_code: 'notlength16' } }, response);
        sinon.assert.calledWith(renderSpy, 'penalty/penaltyGroupSummary', fakePenaltyGroup);
      });
    });
  });
});
