import sinon from 'sinon';
import PaymentService from '../../src/server/services/payment.service';

describe('payment service', () => {
  let service;

  beforeEach(() => {
    service = new PaymentService('https://payment.example.test/');
    service.httpClient = { get: sinon.stub(), post: sinon.stub(), delete: sinon.stub() };
  });

  it('uses the payment and grouped-payment contracts', () => {
    const details = { reference: 'synthetic' };
    service.makePayment(details);
    sinon.assert.calledWithExactly(service.httpClient.post, 'payments/', details, 0, 'MakePayment');
    service.recordGroupPayment(details);
    sinon.assert.calledWithExactly(service.httpClient.post, 'groupPayments/', details, 0, 'RecordGroupPayment');
    service.getGroupPayment('code');
    sinon.assert.calledWithExactly(service.httpClient.get, 'groupPayments/code', 'GetGroupPayment');
  });

  it('uses the reversal contracts', () => {
    service.reversePayment('payment');
    sinon.assert.calledWithExactly(service.httpClient.delete, 'payments/payment', {}, 'ReversePayment');
    service.reverseGroupPayment('payment', 'FPN');
    sinon.assert.calledWithExactly(service.httpClient.delete, 'groupPayments/payment/FPN', {}, 'ReverseGroupPayment');
  });
});
