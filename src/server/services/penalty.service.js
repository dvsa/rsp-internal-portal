import { isEmpty, has } from 'lodash';
import moment from 'moment';
import { isObject } from 'util';

import SignedHttpClient from './../utils/httpclient';

export default class PenaltyService {
  constructor(serviceUrl) {
    this.httpClient = new SignedHttpClient(serviceUrl);
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
      paymentRef: rawPenalty.paymentRef,
      paymentMethod: rawPenalty.paymentMethod,
      enabled: data.Enabled,
    };
    return penaltyDetails;
  }

  getByPaymentCode(paymentCode) {
    const promise = new Promise((resolve, reject) => {
      this.httpClient.get(`documents/tokens/${paymentCode}`).then((response) => {
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
      this.httpClient.get(`documents/${penaltyId}`).then((response) => {
        if (isEmpty(response.data)) {
          reject(new Error('Penalty reference not found'));
        }
        if (response.data.Value.inPenaltyGroup) {
          reject(new Error('Penalty is part of a penalty group'));
        }
        resolve(PenaltyService.parsePenalty(response.data));
      }).catch((error) => {
        reject(new Error(error));
      });
    });
    return promise;
  }

  searchByRegistration(registration) {
    const promise = new Promise((resolve, reject) => {
      this.httpClient.get(`vehicle-reg/${registration}`).then((response) => {
        if (isEmpty(response.data) || response.data.Enabled === false) {
          reject(new Error(`No vehicle found by registration ${registration}`));
        }
        resolve(response.data);
      }).catch((error) => {
        reject(new Error(error));
      });
    });
    return promise;
  }

  async cancel(penaltyId) {
    const penaltyDocumentResp = await this.httpClient.get(`documents/${penaltyId}`);
    if (!has(penaltyDocumentResp, 'data') || !isObject(penaltyDocumentResp.data)) {
      throw new Error('Unexpected penalty penalty response prevented cancellation');
    }
    const penaltyDocument = penaltyDocumentResp.data;
    return this.httpClient.delete(`documents/${penaltyId}`, penaltyDocument);
  }
}
