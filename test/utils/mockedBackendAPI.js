export default class MockedBackEndAPI {
  constructor(penalties) {
    this.penalties = penalties;
  }

  getPenaltyByPaymentCode(code) {
    const result = this.penalties.find(p => p.code === code);

    if (result) {
      return Promise.resolve(result);
    }

    return Promise.reject();
  }

  getPenaltyByReference(reference) {
    const result = this.penalties.find(p => p.reference === reference);

    if (result) {
      return Promise.resolve(result);
    }

    return Promise.reject();
  }
}
