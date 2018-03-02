import { isEmpty, has } from 'lodash';
import moment from 'moment';

export default class PenaltyService {
  constructor(httpClient) {
    this.httpClient = httpClient;
  }

  static getPenaltyTypeDescription(penaltyType) {
    switch (penaltyType.toUpperCase()) {
      case 'CD':
        return 'Court Deposit';
      case 'FPN':
        return 'Fixed Penalty Notice';
      case 'IM':
        return 'immobilisation';
      default:
        return 'Unknown';
    }
  }

  static parsePenalty(rawPenalty) {
    const complete = has(rawPenalty, 'vehicleDetails') && !isEmpty(rawPenalty);
    const penaltyDetails = {
      complete,
      paymentCode: rawPenalty.paymentToken,
      issueDate: moment(rawPenalty.dateTime).format('DD/MM/YYYY'),
      vehicleReg: rawPenalty.vehicleDetails.regNo,
      reference: rawPenalty.referenceNo,
      location: rawPenalty.placeWhereIssued,
      amount: rawPenalty.penaltyAmount,
      status: rawPenalty.paymentStatus,
      type: rawPenalty.penaltyType,
      typeDescription: PenaltyService.getPenaltyTypeDescription(rawPenalty.penaltyType),
      paymentDate: moment(rawPenalty.paymentDate).format('DD/MM/YYYY'),
      paymentAuthCode: rawPenalty.paymentAuthCode,
    };
    return penaltyDetails;
  }

  getByPaymentCode(paymentCode) {
    const promise = new Promise((resolve, reject) => {
      this.httpClient.get(`tokens/${paymentCode}`).then((response) => {
        if (isEmpty(response.data)) {
          reject(new Error('Payment code not found'));
        }
        resolve(PenaltyService.parsePenalty(response.data.Value));
      }).catch((error) => {
        reject(new Error(error));
      });
    });
    return promise;
  }

  getByReference(referenceNumber) {
    const promise = new Promise((resolve, reject) => {
      this.httpClient.get(`references/${referenceNumber}`).then((response) => {
        if (isEmpty(response.data)) {
          reject(new Error('Penalty reference not found'));
        }
        resolve(PenaltyService.parsePenalty(response.data.Value));
      }).catch((error) => {
        reject(new Error(error));
      });
    });
    return promise;
  }
}
