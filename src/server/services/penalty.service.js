import { isEmpty, has } from 'lodash';
import moment from 'moment';
import createHttpClient from './../utils/httpclient';

export default class PenaltyService {
  constructor(serviceUrl) {
    this.httpClient = createHttpClient(serviceUrl);
  }

  static getPenaltyTypeDescription(penaltyType) {
    switch (penaltyType.toUpperCase()) {
      case 'CDN':
        return 'Court Deposit Notice';
      case 'FPN':
        return 'Fixed Penalty Notice';
      case 'IM':
        return 'immobilisation';
      default:
        return 'Unknown';
    }
  }

  static parsePenalty(data) {
    const penaltyId = data.ID;
    const reference = penaltyId.split('_').shift();
    const rawPenalty = data.Value;
    const complete = has(rawPenalty, 'vehicleDetails') && !isEmpty(rawPenalty);
    const penaltyDetails = {
      complete,
      reference,
      paymentCode: rawPenalty.paymentToken,
      issueDate: complete && moment.unix(rawPenalty.dateTime).format('DD/MM/YYYY'),
      vehicleReg: complete && rawPenalty.vehicleDetails.regNo,
      formattedReference: rawPenalty.referenceNo,
      location: complete && rawPenalty.placeWhereIssued,
      amount: rawPenalty.penaltyAmount,
      status: rawPenalty.paymentStatus,
      type: rawPenalty.penaltyType,
      typeDescription: PenaltyService.getPenaltyTypeDescription(rawPenalty.penaltyType),
      paymentDate: rawPenalty.paymentDate ? moment.unix(rawPenalty.paymentDate).format('DD/MM/YYYY') : undefined,
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
        resolve(PenaltyService.parsePenalty(response.data));
      }).catch((error) => {
        reject(new Error(error));
      });
    });
    return promise;
  }

  getById(penaltyId) {
    const promise = new Promise((resolve, reject) => {
      this.httpClient.get(`${penaltyId}`).then((response) => {
        if (isEmpty(response.data)) {
          reject(new Error('Penalty reference not found'));
        }
        resolve(PenaltyService.parsePenalty(response.data));
      }).catch((error) => {
        reject(new Error(error));
      });
    });
    return promise;
  }
}
