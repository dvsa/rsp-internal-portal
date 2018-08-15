import SignedHttpClient from '../utils/httpclient';

export default class PenaltyGroupService {
  constructor(serviceUrl) {
    this.httpClient = new SignedHttpClient(serviceUrl);
  }

  async getByPaymentCode(paymentCode) {
    const resp = await this.httpClient.get(`penaltyGroup/${paymentCode}`);
    return resp.data;
  }
}
