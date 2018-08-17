import SignedHttpClient from './../utils/httpclient';

export default class PaymentService {
  constructor(serviceUrl) {
    this.httpClient = new SignedHttpClient(serviceUrl);
  }

  makePayment(details) {
    return this.httpClient.post('payments/', details);
  }

  recordGroupPayment(details) {
    return this.httpClient.post('groupPayments/', details);
  }

  getGroupPayment(paymentCode) {
    return this.httpClient.get(`groupPayments/${paymentCode}`);
  }

  reversePayment(paymentId) {
    return this.httpClient.delete(`payments/${paymentId}`);
  }
}
