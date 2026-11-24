import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import PenaltyService from '../../src/server/services/penalty.service';

chai.use(chaiAsPromised);

describe('penalty lookup contracts', () => {
  let service;
  const document = {
    ID: '123_FPN',
    Enabled: true,
    Value: {
      penaltyType: 'FPN',
      paymentToken: 'synthetic-code',
      paymentStatus: 'UNPAID',
      penaltyAmount: 100,
    },
  };

  beforeEach(() => {
    service = new PenaltyService('https://penalty.example.test/');
    service.httpClient = { get: sinon.stub(), delete: sinon.stub() };
  });

  it('parses a penalty returned for a payment code', async () => {
    service.httpClient.get.resolves({ data: document });
    expect(await service.getByPaymentCode('synthetic-code')).to.include({
      reference: '123', paymentCode: 'synthetic-code', type: 'FPN',
    });
    sinon.assert.calledWithExactly(service.httpClient.get, 'documents/tokens/synthetic-code', 'GetByPaymentCode');
  });

  it('rejects empty results and grouped penalties', async () => {
    service.httpClient.get.resolves({ data: {} });
    await expect(service.getByPaymentCode('missing')).to.be.rejectedWith('Payment code not found');
    await expect(service.getById('missing')).to.be.rejectedWith('Penalty reference not found');
    service.httpClient.get.resolves({ data: { ...document, Value: { ...document.Value, inPenaltyGroup: true } } });
    await expect(service.getById('123_FPN')).to.be.rejectedWith('Penalty is part of a penalty group');
  });

  it('searches by registration and rejects missing or disabled records', async () => {
    const result = { Penalties: [], PenaltyGroups: [] };
    service.httpClient.get.resolves({ data: result });
    expect(await service.searchByRegistration('AB12CDE')).to.equal(result);
    sinon.assert.calledWithExactly(service.httpClient.get, 'vehicle-reg/AB12CDE', 'SearchByReg');
    service.httpClient.get.resolves({ data: { Enabled: false } });
    await expect(service.searchByRegistration('AB12CDE')).to.be.rejectedWith('No vehicle found');
    service.httpClient.get.resolves({ data: {} });
    await expect(service.searchByRegistration('AB12CDE')).to.be.rejectedWith('No vehicle found');
  });

  it('describes court deposits and unknown penalty types', () => {
    expect(PenaltyService.getPenaltyTypeDescription('cdn')).to.equal('Court Deposit Notice');
    expect(PenaltyService.getPenaltyTypeDescription('other')).to.equal('Unknown');
  });
});
