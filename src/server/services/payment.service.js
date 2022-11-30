import SignedHttpClient from '../utils/httpclient';
import { logInfo, ServiceName } from '../utils/logger';

export default class PaymentService {
  constructor(serviceUrl) {
    this.httpClient = new SignedHttpClient(serviceUrl, {}, ServiceName.Payments);
  }

  makePayment(details) {
    return this.httpClient.post('payments/', details, 0, 'MakePayment');
  }

  recordGroupPayment(details) {
    return this.httpClient.post('groupPayments/', details, 0, 'RecordGroupPayment');
  }

  getGroupPayment(paymentCode) {
    return this.httpClient.get(`groupPayments/${paymentCode}`, 'GetGroupPayment');
  }

  reverseGroupPayment(paymentId, penaltyType) {
    return this.httpClient.delete(`groupPayments/${paymentId}/${penaltyType}`, {}, 'ReverseGroupPayment');
  }

  reversePayment(paymentId) {
    logInfo('PaymentServiceReversePayment', { paymentId });
    return this.httpClient.delete(`payments/${paymentId}`, {}, 'ReversePayment');
  }
}
