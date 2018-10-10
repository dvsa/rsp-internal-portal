import moment from 'moment';
import { find, isEmpty, uniq } from 'lodash';

import PenaltyService from './penalty.service';
import SignedHttpClient from '../utils/httpclient';

export default class PenaltyGroupService {
  constructor(serviceUrl) {
    this.httpClient = new SignedHttpClient(serviceUrl);
  }

  async getByPaymentCode(paymentCode) {
    try {
      const response = await this.httpClient.get(`penaltyGroup/${paymentCode}`);
      if (isEmpty(response.data) || !response.data.ID) {
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
      } = response.data;
      const {
        splitAmounts,
        parsedPenalties,
        nextPayment,
      } = PenaltyGroupService.parsePayments(Payments);
      return {
        isPenaltyGroup: true,
        isCancellable: splitAmounts.some(a => a.status === 'UNPAID') && Enabled !== false,
        penaltyGroupDetails: {
          registrationNumber: VehicleRegistration,
          location: Location,
          date: moment.unix(Timestamp).format('DD/MM/YYYY'),
          amount: TotalAmount,
          enabled: Enabled,
          splitAmounts,
        },
        paymentCode: ID,
        penaltyDetails: parsedPenalties,
        paymentStatus: PaymentStatus,
        nextPayment,
      };
    } catch (err) {
      throw new Error(err);
    }
  }

  static getNextPayment(unpaidPayments) {
    const FPNPayment = find(unpaidPayments, ['PaymentCategory', 'FPN']);
    const CDNPayment = find(unpaidPayments, ['PaymentCategory', 'CDN']);
    const IMPayment = find(unpaidPayments, ['PaymentCategory', 'IM']);
    return IMPayment || FPNPayment || CDNPayment;
  }

  static parsePayments(paymentsArr) {
    const splitAmounts = paymentsArr.map(payment => ({
      type: payment.PaymentCategory,
      amount: payment.TotalAmount,
      status: payment.PaymentStatus,
    }));
    const types = uniq(paymentsArr.map(payment => payment.PaymentCategory));
    const parsedPenalties = types.map((type) => {
      const penalties = paymentsArr.filter(p => p.PaymentCategory === type)[0].Penalties;
      return {
        type,
        penalties: penalties.map(p => PenaltyService.parsePenalty(p)),
      };
    });
    const unpaidPayments = paymentsArr.filter(payment => payment.PaymentStatus === 'UNPAID');
    const nextPayment = PenaltyGroupService.getNextPayment(unpaidPayments);
    return { splitAmounts, parsedPenalties, nextPayment };
  }

  getPaymentsByCodeAndType(paymentCode, type) {
    return this.httpClient.get(`penaltyGroup/${paymentCode}`).then((response) => {
      if (isEmpty(response.data) || !response.data.ID) {
        throw new Error('Payment code not found');
      }
      const { Payments } = response.data;
      const pensOfType = Payments.filter(p => p.PaymentCategory === type)[0].Penalties;
      const parsedPenalties = pensOfType.map(p => PenaltyService.parsePenalty(p));
      return {
        penaltyDetails: parsedPenalties,
        penaltyType: type,
        totalAmount: pensOfType.reduce((total, pen) => total + pen.Value.penaltyAmount, 0),
        paymentStatus: parsedPenalties.every(p => p.status === 'PAID') ? 'PAID' : 'UNPAID',
      };
    }).catch((error) => {
      throw new Error(error);
    });
  }

  cancel(paymentCode) {
    return this.httpClient.delete(`penaltyGroup/${paymentCode}`);
  }
}
