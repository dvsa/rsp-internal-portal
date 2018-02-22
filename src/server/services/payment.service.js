
export default class paymentService {
  constructor() {
    this.mockedPenalties = [
      {
        status: 'Paid',
        code: 'a1b2c3d4e5f621ac',
        type: 'Fixed penalty',
        amount: '£80',
        reference: '12345678910',
        vehicle_reg: 'AB 123 CD',
        issue_date: '25/01/2018',
        location: 'Ashford',
        payment: {
          confirmation_code: 'a1b3c3d4e5f6',
          receipt_number: 123456789101112,
          authorisation_code: 123456,
        },
      },
      {
        status: 'Unpaid',
        code: '1111111111111111',
        type: 'Fixed penalty',
        amount: '£80',
        reference: '52345678910',
        vehicle_reg: 'AB 973 CD',
        issue_date: '25/01/2018',
        location: 'Ashford',
      },
      {
        status: 'Paid',
        code: '2222222222222222',
        type: 'Fixed penalty',
        amount: '£80',
        reference: '62345678910',
        vehicle_reg: 'AB 157 CD',
        issue_date: '25/01/2018',
        location: 'Ashford',
        payment: {
          confirmation_code: 'a1b3c3d4e5f6',
          receipt_number: 723456789101112,
          authorisation_code: 523456,
        },
      },
    ];
  }

  getPenaltyDetails(paymentCode) {
    const promise = new Promise((resolve, reject) => {
      const result = this.mockedPenalties.find(penalty => penalty.code === paymentCode);
      setTimeout(() => {
        if (result) {
          resolve(result);
        }
        reject(new Error('Invalid Payment code'));
      }, 2000);
    });

    return promise;
  }
}
