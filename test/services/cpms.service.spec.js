import { expect } from 'chai';
import sinon from 'sinon';
import fakePenaltyGroups from '../data/penaltyGroup/fake-penalty-groups-enriched.json';

import CpmsService from '../../src/server/services/cpms.service';
import HttpClient from '../../src/server/utils/httpclient';

describe('CPMS Service', () => {
  const cpmsService = new CpmsService('localhost');
  let httpClientStub;

  describe('createCardNotPresentGroupTransaction', () => {
    const penaltyGroup = fakePenaltyGroups.find(group => group.paymentCode === '5624r2wupfs');
    beforeEach(() => {
      httpClientStub = sinon.stub(HttpClient.prototype, 'post');
      httpClientStub
        .withArgs('groupCardPayment/', {
          TotalAmount: 120,
          PaymentMethod: 'CNP',
          VehicleRegistration: '11DDD',
          PenaltyGroupId: '5624r2wupfs',
          PenaltyType: 'FPN',
          RedirectUrl: 'http://redirect.url',
          Penalties: [
            {
              PenaltyReference: '564548184556',
              PenaltyAmount: 100,
              VehicleRegistration: '11DDD',
            },
            {
              PenaltyReference: '5281756140484',
              PenaltyAmount: 20,
              VehicleRegistration: '11DDD',
            },
          ],
        })
        .resolves('resolved value');
    });
    it('should return POST promise from groupCardNotPresent endpoint', async () => {
      const resolution = await cpmsService.createCardNotPresentGroupTransaction(
        '5624r2wupfs',
        penaltyGroup.penaltyGroupDetails,
        'FPN',
        penaltyGroup.penaltyDetails[0].penalties,
        'http://redirect.url',
      );
      expect(resolution).to.equal('resolved value');
    });
  });
});
