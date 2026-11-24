import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import PenaltyGroupService from '../../src/server/services/penaltyGroup.service';

chai.use(chaiAsPromised);

describe('penalty group service', () => {
  let service;
  const penalty = {
    ID: '123_FPN',
    Enabled: true,
    Value: {
      penaltyType: 'FPN',
      penaltyAmount: 100,
      paymentStatus: 'UNPAID',
      paymentToken: 'synthetic',
    },
  };
  const group = {
    ID: 'synthetic',
    Enabled: true,
    PaymentStatus: 'UNPAID',
    VehicleRegistration: 'AB12CDE',
    Timestamp: 1577836800,
    TotalAmount: 100,
    Payments: [{
      PaymentCategory: 'FPN',
      TotalAmount: 100,
      PaymentStatus: 'UNPAID',
      Penalties: [penalty],
    }],
  };

  beforeEach(() => {
    service = new PenaltyGroupService('https://penalty.example.test/');
    service.httpClient = { get: sinon.stub(), delete: sinon.stub() };
  });

  it('parses group details and unpaid penalties', async () => {
    service.httpClient.get.resolves({ data: group });
    const result = await service.getByPaymentCode('synthetic');
    expect(result).to.include({ paymentCode: 'synthetic', paymentStatus: 'UNPAID', isCancellable: true });
    expect(result.penaltyGroupDetails.splitAmounts).to.deep.equal([{ type: 'FPN', amount: 100, status: 'UNPAID' }]);
    expect(result.penaltyDetails[0].penalties[0]).to.include({ reference: '123', amount: 100 });
    sinon.assert.calledWithExactly(service.httpClient.get, 'penaltyGroup/synthetic', 'GetGroupByPaymentCode');
  });

  it('returns a type breakdown and total', async () => {
    service.httpClient.get.resolves({ data: group });
    const result = await service.getPaymentsByCodeAndType('synthetic', 'FPN');
    expect(result).to.include({ penaltyType: 'FPN', totalAmount: 100, paymentStatus: 'UNPAID' });
    sinon.assert.calledWithExactly(service.httpClient.get, 'penaltyGroup/synthetic', 'GetGroupPayments');
  });

  it('rejects missing group data in both lookups', async () => {
    service.httpClient.get.resolves({ data: {} });
    await expect(service.getByPaymentCode('missing')).to.be.rejectedWith('Payment code not found');
    await expect(service.getPaymentsByCodeAndType('missing', 'FPN')).to.be.rejectedWith('Payment code not found');
  });

  it('prioritises immobilisation, then FPN, then CDN', () => {
    const im = { PaymentCategory: 'IM' };
    const fpn = { PaymentCategory: 'FPN' };
    const cdn = { PaymentCategory: 'CDN' };
    expect(PenaltyGroupService.getNextPayment([cdn, fpn, im])).to.equal(im);
    expect(PenaltyGroupService.getNextPayment([cdn, fpn])).to.equal(fpn);
    expect(PenaltyGroupService.getNextPayment([cdn])).to.equal(cdn);
    expect(PenaltyGroupService.getNextPayment([])).to.equal(undefined);
  });

  it('deletes the group by payment code', () => {
    service.cancel('synthetic');
    sinon.assert.calledWithExactly(service.httpClient.delete, 'penaltyGroup/synthetic', undefined, 'CancelPenaltyGroup');
  });
});
