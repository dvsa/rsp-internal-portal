import { expect } from 'chai';
import sinon from 'sinon';
import fakePenaltyGroups from '../data/penaltyGroup/fake-penalty-groups-enriched.json';

import CpmsService from '../../src/server/services/cpms.service';
import HttpClient from '../../src/server/utils/httpclient';

describe('CPMS Service', () => {
  const cpmsService = new CpmsService('localhost');
  let httpClientStub;
  beforeEach(() => {
    httpClientStub = sinon.stub(HttpClient.prototype, 'post');
  });
  afterEach(() => {
    HttpClient.prototype.post.restore();
  });

  const penaltyGroup = fakePenaltyGroups.find(group => group.paymentCode === '5624r2wupfs');

  describe('createCardNotPresentGroupTransaction', () => {
    context('for a group of fixed penalties', () => {
      beforeEach(() => {
        httpClientStub
          .withArgs('groupPayment/', {
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

    context('for an immobilisation', () => {
      beforeEach(() => {
        httpClientStub
          .withArgs('groupPayment/', {
            TotalAmount: 80,
            PaymentMethod: 'CNP',
            VehicleRegistration: '11DDD',
            PenaltyGroupId: '5624r2wupfs',
            PenaltyType: 'IM',
            RedirectUrl: 'http://redirect.url',
            Penalties: [
              {
                PenaltyReference: '54663-0-441-IM',
                PenaltyAmount: 80,
                VehicleRegistration: '11DDD',
              },
            ],
          })
          .resolves('resolved value');
      });
      it('should return POST promise for groupCardNotPresent endpoint', async () => {
        const resolution = await cpmsService.createCardNotPresentGroupTransaction(
          '5624r2wupfs',
          penaltyGroup.penaltyGroupDetails,
          'IM',
          penaltyGroup.penaltyDetails[1].penalties,
          'http://redirect.url',
        );
        expect(resolution).to.equal('resolved value');
      });
    });
  });

  describe('createGroupCashTransaction', () => {
    context('for a group of fixed penalties', () => {
      beforeEach(() => {
        httpClientStub
          .withArgs('groupPayment/', {
            TotalAmount: 120,
            PaymentMethod: 'CASH',
            VehicleRegistration: '11DDD',
            PenaltyGroupId: '5624r2wupfs',
            PenaltyType: 'FPN',
            SlipNumber: '1234',
            BatchNumber: '1234',
            ReceiptDate: new Date().toISOString().split('T')[0],
            RedirectUrl: 'https://redirect.url',
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
      it('should return a POST promise from the groupCashPayment endpoint', async () => {
        const resolution = await cpmsService.createGroupCashTransaction(
          '5624r2wupfs',
          penaltyGroup.penaltyGroupDetails,
          'FPN',
          penaltyGroup.penaltyDetails,
          'https://redirect.url',
          '1234',
        );
        expect(resolution).to.equal('resolved value');
      });
    });

    context('for an immobilisation', () => {
      beforeEach(() => {
        httpClientStub
          .withArgs('groupPayment/', {
            TotalAmount: 80,
            PaymentMethod: 'CASH',
            VehicleRegistration: '11DDD',
            PenaltyGroupId: '5624r2wupfs',
            PenaltyType: 'IM',
            SlipNumber: '1234',
            BatchNumber: '1234',
            ReceiptDate: new Date().toISOString().split('T')[0],
            RedirectUrl: 'https://redirect.url',
            Penalties: [
              {
                PenaltyReference: '54663-0-441-IM',
                PenaltyAmount: 80,
                VehicleRegistration: '11DDD',
              },
            ],
          })
          .resolves('resolved value');
      });
      it('should return a POST promise from the groupCashPayment endpoint', async () => {
        const resolution = await cpmsService.createGroupCashTransaction(
          '5624r2wupfs',
          penaltyGroup.penaltyGroupDetails,
          'IM',
          penaltyGroup.penaltyDetails,
          'https://redirect.url',
          '1234',
        );
        expect(resolution).to.equal('resolved value');
      });
    });
  });

  describe('createGroupChequeTransaction', () => {
    context('for a group of fixed penalties', () => {
      beforeEach(() => {
        httpClientStub
          .withArgs('groupPayment/', {
            TotalAmount: 120,
            PaymentMethod: 'CHEQUE',
            VehicleRegistration: '11DDD',
            PenaltyGroupId: '5624r2wupfs',
            PenaltyType: 'FPN',
            SlipNumber: '1234',
            BatchNumber: '1234',
            ReceiptDate: new Date().toISOString().split('T')[0],
            ChequeNumber: '2468',
            ChequeDate: sinon.match.date,
            NameOnCheque: 'Joe Bloggs',
            RedirectUrl: 'https://redirect.url',
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
      it('should return a POST promise from the groupPayment endpoint', async () => {
        const resolution = await cpmsService.createGroupChequeTransaction(
          '5624r2wupfs',
          penaltyGroup.penaltyGroupDetails,
          'FPN',
          penaltyGroup.penaltyDetails,
          'https://redirect.url',
          '1234',
          '2468',
          new Date(),
          'Joe Bloggs',
        );
        expect(resolution).to.equal('resolved value');
      });
    });

    context('for an immobilisation', () => {
      beforeEach(() => {
        httpClientStub
          .withArgs('groupPayment/', {
            TotalAmount: 80,
            PaymentMethod: 'CHEQUE',
            VehicleRegistration: '11DDD',
            PenaltyGroupId: '5624r2wupfs',
            PenaltyType: 'IM',
            SlipNumber: '1234',
            BatchNumber: '1234',
            ReceiptDate: new Date().toISOString().split('T')[0],
            ChequeNumber: '2468',
            ChequeDate: sinon.match.date,
            NameOnCheque: 'Joe Bloggs',
            RedirectUrl: 'https://redirect.url',
            Penalties: [
              {
                PenaltyReference: '54663-0-441-IM',
                PenaltyAmount: 80,
                VehicleRegistration: '11DDD',
              },
            ],
          })
          .resolves('resolved value');
      });
      it('should return a POST promise from the groupPayment endpoint', async () => {
        const resolution = await cpmsService.createGroupChequeTransaction(
          '5624r2wupfs',
          penaltyGroup.penaltyGroupDetails,
          'IM',
          penaltyGroup.penaltyDetails,
          'https://redirect.url',
          '1234',
          '2468',
          new Date(),
          'Joe Bloggs',
        );
        expect(resolution).to.equal('resolved value');
      });
    });
  });

  describe('createGroupPostalOrderTransaction', () => {
    context('for a group of fixed penalties', () => {
      beforeEach(() => {
        httpClientStub
          .withArgs('groupPayment/', {
            TotalAmount: 120,
            PaymentMethod: 'POSTAL_ORDER',
            VehicleRegistration: '11DDD',
            PenaltyGroupId: '5624r2wupfs',
            PenaltyType: 'FPN',
            SlipNumber: '1234',
            BatchNumber: '1234',
            PostalOrderNumber: '2468',
            ReceiptDate: new Date().toISOString().split('T')[0],
            RedirectUrl: 'https://redirect.url',
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
      it('should return a POST promise from the groupPayment endpoint', async () => {
        const resolution = await cpmsService.createGroupPostalOrderTransaction(
          '5624r2wupfs',
          penaltyGroup.penaltyGroupDetails,
          'FPN',
          penaltyGroup.penaltyDetails,
          'https://redirect.url',
          '1234',
          '2468',
        );
        expect(resolution).to.equal('resolved value');
      });
    });

    context('for an immobilisation', () => {
      beforeEach(() => {
        httpClientStub
          .withArgs('groupPayment/', {
            TotalAmount: 80,
            PaymentMethod: 'POSTAL_ORDER',
            VehicleRegistration: '11DDD',
            PenaltyGroupId: '5624r2wupfs',
            PenaltyType: 'IM',
            SlipNumber: '1234',
            BatchNumber: '1234',
            PostalOrderNumber: '2468',
            ReceiptDate: new Date().toISOString().split('T')[0],
            RedirectUrl: 'https://redirect.url',
            Penalties: [
              {
                PenaltyReference: '54663-0-441-IM',
                PenaltyAmount: 80,
                VehicleRegistration: '11DDD',
              },
            ],
          })
          .resolves('resolved value');
      });
      it('should return a POST promise from the groupPayment endpoint', async () => {
        const resolution = await cpmsService.createGroupPostalOrderTransaction(
          '5624r2wupfs',
          penaltyGroup.penaltyGroupDetails,
          'IM',
          penaltyGroup.penaltyDetails,
          'https://redirect.url',
          '1234',
          '2468',
        );
        expect(resolution).to.equal('resolved value');
      });
    });
  });
});
