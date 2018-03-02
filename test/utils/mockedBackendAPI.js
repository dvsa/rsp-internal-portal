export default class MockedBackEndAPI {
  constructor(penalties) {
    this.penalties = penalties;
  }

  getPenaltyByPaymentCode(requestUrl) {
    const code = requestUrl.split('/').pop();
    const result = this.penalties.find(p => p.paymentToken === code);

    if (result) {
      return Promise.resolve({ data: { Value: result } });
    }

    return Promise.reject(new Error('Invalid Payment Code'));
  }

  getPenaltyByReference(requestUrl) {
    const reference = requestUrl.split('/').pop();
    const result = this.penalties.find(p => p.referenceNo === reference);

    if (result) {
      return Promise.resolve({ data: { Value: result } });
    }

    return Promise.reject(new Error('Invalid Penalty Reference'));
  }
}
