import { isEmpty, has } from 'lodash';
import moment from 'moment';
import { isObject } from 'util';
import isPaymentOverdue from '../utils/isPaymentOverdue';
import config from '../config';
import SignedHttpClient from '../utils/httpclient';
import { MOMENT_DATE_FORMAT, MOMENT_DATE_TIME_FORMAT } from '../utils/dateTimeFormat';
import { logDebug, ServiceName } from '../utils/logger';
import { isCancellable } from '../utils/isCancellable';
import { isReversible } from '../utils/isReversible';

export default class PenaltyService {
  constructor(serviceUrl) {
    this.httpClient = new SignedHttpClient(serviceUrl, {}, ServiceName.PenaltyService);
  }

  static getPenaltyTypeDescription(penaltyType) {
    switch (penaltyType.toUpperCase()) {
      case 'CDN':
        return 'Court Deposit Notice';
      case 'FPN':
        return 'Fixed Penalty Notice';
      case 'IM':
        return 'Immobilisation';
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
      penaltyIssueDate: complete && moment.unix(rawPenalty.dateTime).format(MOMENT_DATE_FORMAT),
      vehicleReg: complete && rawPenalty.vehicleDetails.regNo,
      formattedReference: rawPenalty.referenceNo,
      location: complete && rawPenalty.placeWhereIssued,
      amount: rawPenalty.penaltyAmount,
      status: rawPenalty.paymentStatus,
      type: rawPenalty.penaltyType,
      typeDescription: PenaltyService.getPenaltyTypeDescription(rawPenalty.penaltyType),
      paymentDate: rawPenalty.paymentDate
        ? moment.unix(rawPenalty.paymentDate).format(MOMENT_DATE_FORMAT)
        : undefined,
      paymentAuthCode: rawPenalty.paymentAuthCode,
      paymentRef: rawPenalty.paymentRef,
      paymentMethod: rawPenalty.paymentMethod,
      enabled: data.Enabled,
      paymentCodeIssueDateTime: rawPenalty.paymentCodeDateTime
        ? moment.unix(rawPenalty.paymentCodeDateTime).format(MOMENT_DATE_TIME_FORMAT)
        : undefined,
      isPaymentOverdue: isPaymentOverdue(rawPenalty.paymentCodeDateTime, config.paymentLimitDays()),
      paymentStartTime: rawPenalty.paymentStartTime,
      isCancellable: isCancellable(rawPenalty.paymentStatus, data.Enabled, rawPenalty.paymentStartTime),
      isReversible: isReversible(rawPenalty.paymentStatus, rawPenalty.paymentDate, rawPenalty.paymentMethod),
    };
    return penaltyDetails;
  }

  async getByPaymentCode(paymentCode) {
    logDebug('getByPaymentCode', {
      message: 'Get penalty by payment code',
      paymentCode,
    });
    const response = await this.httpClient.get(`documents/tokens/${paymentCode}`, 'GetByPaymentCode');
    if (isEmpty(response.data)) {
      throw new Error('Payment code not found');
    }
    return PenaltyService.parsePenalty(response.data);
  }

  async getById(penaltyId) {
    const response = await this.httpClient.get(`documents/${penaltyId}`, 'GetById');
    if (isEmpty(response.data)) {
      throw new Error('Penalty reference not found');
    }
    if (response.data.Value.inPenaltyGroup) {
      throw new Error('Penalty is part of a penalty group');
    }
    return PenaltyService.parsePenalty(response.data);
  }

  async searchByRegistration(registration) {
    const response = await this.httpClient.get(`vehicle-reg/${registration}`, 'SearchByReg');
    if (isEmpty(response.data) || response.data.Enabled === false) {
      throw new Error(`No vehicle found by registration ${registration}`);
    }
    return response.data;
  }

  async cancel(penaltyId) {
    const penaltyDocumentResp = await this.httpClient.get(`documents/${penaltyId}`, 'GetDocument');
    if (!has(penaltyDocumentResp, 'data') || !isObject(penaltyDocumentResp.data)) {
      throw new Error('Unexpected penalty response prevented cancellation');
    }
    const penaltyDocument = penaltyDocumentResp.data;
    return this.httpClient.delete(`documents/${penaltyId}`, penaltyDocument, 'CancelDocument');
  }
}
