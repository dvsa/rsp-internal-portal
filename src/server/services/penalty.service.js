export default class penaltyService {
  constructor(httpClient) {
    this.httpClient = httpClient;
  }

  getByPaymentCode(paymentCode) {
    return this.httpClient.get(`/token/${paymentCode}`);
  }

  getByReference(referenceNumber) {
    return this.httpClient.get(`/token/${referenceNumber}`);
  }
}
