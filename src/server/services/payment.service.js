import createHttpClient from './../utils/httpclient';

export default class PaymentService {
  constructor(serviceUrl) {
    this.httpClient = createHttpClient(serviceUrl);
  }

  makePayment(details) {
    return this.httpClient.post('payments/', details);
  }

  reversePayment(details) {
    return this.httpClient.put('payments/', details);
  }
}
