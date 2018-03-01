export default class penaltyService {
  constructor(httpClient) {
    this.httpClient = httpClient;
  }

  getByPaymentCode(paymentCode) {
    console.log(this.httpClient);
    return this.httpClient.get(`tokens/${paymentCode}`);
  }

  getByReference(referenceNumber) {
    return this.httpClient.get(`references/${referenceNumber}`);
  }
}
