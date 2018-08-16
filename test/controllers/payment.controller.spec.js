import sinon from 'sinon';

import * as PaymentController from '../../src/server/controllers/payment.controller';
import CpmsService from '../../src/server/services/cpms.service';
import PenaltyGroupService from '../../src/server/services/penaltyGroup.service';
import getPenaltyGroupFake from '../data/penaltyGroup/enchrichedPenaltyGroupFake';
import fakeEnrichedPenaltyGroups from '../data/penaltyGroup/fake-penalty-groups-enriched.json';

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
            'https://localhost/payment-code/5624r2wupfs',
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
});
