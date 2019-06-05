import sinon from 'sinon';

import * as PenaltyController from '../../src/server/controllers/penalty.controller';
import PenaltyService from '../../src/server/services/penalty.service';

describe('PenaltyController', () => {
  describe('cancelPenalty', () => {
    let penaltyServiceMock;
    const redirectSpy = sinon.spy();
    const response = { redirect: redirectSpy };
    const penaltyId = '123456789012_FPN';
    let request;

    beforeEach(() => {
      penaltyServiceMock = sinon.stub(PenaltyService.prototype, 'cancel');
      request = { params: { penalty_id: penaltyId }, session: { rsp_user_role: 'BankingFinance', rsp_user: { email: 'test_user@example.com' } } };
    });
    afterEach(() => {
      PenaltyService.prototype.cancel.restore();
    });

    context('given the penalty service cancellation resolves', () => {
      beforeEach(() => {
        penaltyServiceMock
          .withArgs(penaltyId)
          .resolves();
      });
      it('should redirect to the penalty page', async () => {
        await PenaltyController.cancelPenalty(request, response);
        sinon.assert.calledWith(penaltyServiceMock, penaltyId);
        sinon.assert.calledWith(redirectSpy, `/penalty/${penaltyId}`);
      });
    });

    context('given the penalty service cancellation rejects', () => {
      beforeEach(() => {
        penaltyServiceMock
          .withArgs(penaltyId)
          .rejects();
      });
      it('should redirect to the penalty page with a cancellation failed query parameter', async () => {
        await PenaltyController.cancelPenalty(request, response);
        sinon.assert.calledWith(redirectSpy, `/penalty/${penaltyId}?cancellation=failed`);
      });
    });
  });
});
