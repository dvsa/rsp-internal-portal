import moment from 'moment';
import { find, isEmpty, uniq } from 'lodash';

import PenaltyService from './penalty.service';
import SignedHttpClient from '../utils/httpclient';
import { MOMENT_DATE_TIME_FORMAT } from '../utils/dateTimeFormat';
import { recentPayment } from '../utils/recentPayment';
import isPaymentOverdue from '../utils/isPaymentOverdue';
import { logError } from '../utils/logger';
import config from '../config';

export default class PenaltyGroupService {
  constructor(serviceUrl) {
    this.httpClient = new SignedHttpClient(serviceUrl);
  }

  async getByPaymentCode(paymentCode) {
    const response = await this.httpClient.get(`penaltyGroup/${paymentCode}`, 'GetGroupByPaymentCode');
    if (isEmpty(response.data) || !response.data.ID) {
      logError('getByPaymentCodeError', { error: 'Payment code not found' });
      throw new Error('Payment code not found');
    }

    const {
      Payments,
      ID,
      PaymentStatus,
      VehicleRegistration,
      Location,
      Timestamp,
      TotalAmount,
      Enabled,
      fpnPaymentStartTime,
      imPaymentStartTime,
      cdnPaymentStartTime,
    } = response.data;
    const {
      splitAmounts,
      parsedPenalties,
      nextPayment,
    } = PenaltyGroupService.parsePayments(Payments);
    // If a recent payment attempt was made, block cancellation
    const recentPendingPayment = recentPayment(fpnPaymentStartTime)
      || recentPayment(imPaymentStartTime)
      || recentPayment(cdnPaymentStartTime);

    return {
      isPenaltyGroup: true,
      isCancellable: splitAmounts.some((a) => a.status === 'UNPAID') && Enabled !== false && !recentPendingPayment,
      penaltyGroupDetails: {
        registrationNumber: VehicleRegistration,
        location: Location,
        dateTime: moment.unix(Timestamp).format(MOMENT_DATE_TIME_FORMAT),
        isPaymentOverdue: isPaymentOverdue(Timestamp, config.paymentLimitDays(), config.featureBypassExpiryDate()),
        amount: TotalAmount,
        enabled: Enabled,
        splitAmounts,
      },
      paymentCode: ID,
      penaltyDetails: parsedPenalties,
      paymentStatus: PaymentStatus,
      nextPayment,
    };
  }

  static getNextPayment(unpaidPayments) {
    const FPNPayment = find(unpaidPayments, ['PaymentCategory', 'FPN']);
    const CDNPayment = find(unpaidPayments, ['PaymentCategory', 'CDN']);
    const IMPayment = find(unpaidPayments, ['PaymentCategory', 'IM']);
    return IMPayment || FPNPayment || CDNPayment;
  }

  static parsePayments(paymentsArr) {
    const splitAmounts = paymentsArr.map((payment) => ({
      type: payment.PaymentCategory,
      amount: payment.TotalAmount,
      status: payment.PaymentStatus,
    }));
    const types = uniq(paymentsArr.map((payment) => payment.PaymentCategory));
    const parsedPenalties = types.map((type) => {
      const penalties = paymentsArr.filter((p) => p.PaymentCategory === type)[0].Penalties;
      return {
        type,
        penalties: penalties.map((p) => PenaltyService.parsePenalty(p)),
      };
    });
    const unpaidPayments = paymentsArr.filter((payment) => payment.PaymentStatus === 'UNPAID');
    const nextPayment = PenaltyGroupService.getNextPayment(unpaidPayments);
    return { splitAmounts, parsedPenalties, nextPayment };
  }

  async getPaymentsByCodeAndType(paymentCode, type) {
    const response = await this.httpClient.get(`penaltyGroup/${paymentCode}`, 'GetGroupPayments');
    if (isEmpty(response.data) || !response.data.ID) {
      throw new Error('Payment code not found');
    }
    const { Payments, Timestamp } = response.data;
    const pensOfType = Payments.filter((p) => p.PaymentCategory === type)[0].Penalties;
    const parsedPenalties = pensOfType.map((p) => PenaltyService.parsePenalty(p));
    return {
      penaltyDetails: parsedPenalties,
      penaltyType: type,
      totalAmount: pensOfType.reduce((total, pen) => total + pen.Value.penaltyAmount, 0),
      paymentStatus: parsedPenalties.every((p) => p.status === 'PAID') ? 'PAID' : 'UNPAID',
      isPaymentOverdue: isPaymentOverdue(Timestamp, config.paymentLimitDays(), config.featureBypassExpiryDate()),
    };
  }

  cancel(paymentCode) {
    return this.httpClient.delete(`penaltyGroup/${paymentCode}`, undefined, 'CancelPenaltyGroup');
  }
}
