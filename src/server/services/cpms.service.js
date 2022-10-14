import { isEmpty } from 'lodash';
import SignedHttpClient from '../utils/httpclient';
import { ServiceName } from '../utils/logger';

export default class PaymentService {
  constructor(serviceUrl) {
    this.httpClient = new SignedHttpClient(serviceUrl, {}, ServiceName.CPMS);
  }

  createCardNotPresentTransaction(paymentCode, reg, penaltyRef, penaltyType, amount, redirectUrl) {
    const payload = {
      payment_code: paymentCode,
      penalty_reference: penaltyRef,
      penalty_type: penaltyType,
      penalty_amount: amount,
      redirect_url: redirectUrl,
      vehicle_reg: reg,
    };
    return this.httpClient.post('cardNotPresentPayment/', payload, 3, 'CNPPayment');
  }

  createCardNotPresentGroupTransaction(penGrpId, penGrpDetails, type, penalties, redirectUrl) {
    const total = penGrpDetails.splitAmounts.find((a) => a.type === type).amount;
    const payload = {
      TotalAmount: total,
      PaymentMethod: 'CNP',
      VehicleRegistration: penGrpDetails.registrationNumber,
      PenaltyGroupId: penGrpId,
      PenaltyType: type,
      RedirectUrl: redirectUrl,
      Penalties: penalties.map((p) => ({
        PenaltyReference: p.formattedReference,
        PenaltyAmount: p.amount,
        VehicleRegistration: p.vehicleReg,
      })),
    };
    return this.httpClient.post('groupPayment/', payload, 3, 'GroupCNPPayment');
  }

  createCashTransaction(paymentCode, reg, penaltyRef, penaltyType, amount, slipNumber) {
    const payload = {
      payment_code: paymentCode,
      penalty_reference: penaltyRef,
      penalty_type: penaltyType,
      penalty_amount: amount,
      slip_number: slipNumber,
      receipt_date: new Date().toISOString().split('T')[0],
      batch_number: slipNumber,
      vehicle_reg: reg,
    };
    return this.httpClient.post('cashPayment/', payload, 3, 'CashPayment');
  }

  createGroupCashTransaction(penGrpId, penGrpDetails, type, penalties, redirectUrl, slipNumber) {
    const total = penGrpDetails.splitAmounts.find((a) => a.type === type).amount;
    const penaltiesOfType = penalties.find((p) => p.type === type).penalties;

    const payload = {
      TotalAmount: total,
      PaymentMethod: 'CASH',
      VehicleRegistration: penGrpDetails.registrationNumber,
      PenaltyGroupId: penGrpId,
      PenaltyType: type,
      RedirectUrl: redirectUrl,
      SlipNumber: slipNumber,
      ReceiptDate: new Date().toISOString().split('T')[0],
      BatchNumber: slipNumber,
      Penalties: penaltiesOfType.map((p) => ({
        PenaltyReference: p.formattedReference,
        PenaltyAmount: p.amount,
        VehicleRegistration: p.vehicleReg,
      })),
    };
    return this.httpClient.post('groupPayment/', payload, 3, 'GroupCashPayment');
  }

  createChequeTransaction(
    paymentCode,
    vehicleReg,
    penaltyReference,
    penaltyType,
    amount,
    slipNumber,
    chequeDate,
    chequeNumber,
    nameOnCheque,
  ) {
    const payload = {
      payment_code: paymentCode,
      penalty_reference: penaltyReference,
      penalty_type: penaltyType,
      penalty_amount: amount,
      slip_number: slipNumber,
      receipt_date: new Date().toISOString().split('T')[0],
      batch_number: slipNumber,
      cheque_date: chequeDate,
      cheque_number: chequeNumber,
      name_on_cheque: nameOnCheque,
      vehicle_reg: vehicleReg,
    };
    return this.httpClient.post('chequePayment/', payload, 3, 'ChequePayment');
  }

  createGroupChequeTransaction(
    penGrpId,
    penGrpDetails,
    type,
    penalties,
    redirectUrl,
    slipNumber,
    chequeNumber,
    chequeDate,
    nameOnCheque,
  ) {
    const total = penGrpDetails.splitAmounts.find((a) => a.type === type).amount;
    const penaltiesOfType = penalties.find((p) => p.type === type).penalties;
    const payload = {
      TotalAmount: total,
      PaymentMethod: 'CHEQUE',
      VehicleRegistration: penGrpDetails.registrationNumber,
      PenaltyGroupId: penGrpId,
      PenaltyType: type,
      RedirectUrl: redirectUrl,
      ReceiptDate: new Date().toISOString().split('T')[0],
      SlipNumber: slipNumber,
      BatchNumber: slipNumber,
      ChequeNumber: chequeNumber,
      ChequeDate: chequeDate,
      NameOnCheque: nameOnCheque,
      Penalties: penaltiesOfType.map((p) => ({
        PenaltyReference: p.formattedReference,
        PenaltyAmount: p.amount,
        VehicleRegistration: p.vehicleReg,
      })),
    };
    return this.httpClient.post('groupPayment/', payload, 3, 'GroupChequePayment');
  }

  createPostalOrderTransaction(
    paymentCode,
    vehicleReg,
    penaltyReference,
    penaltyType,
    amount,
    slipNumber,
    postalOrderNumber,
  ) {
    const payload = {
      payment_code: paymentCode,
      penalty_reference: penaltyReference,
      penalty_type: penaltyType,
      penalty_amount: amount,
      slip_number: slipNumber,
      receipt_date: new Date().toISOString().split('T')[0],
      batch_number: slipNumber,
      postal_order_number: postalOrderNumber,
      vehicle_reg: vehicleReg,
    };
    return this.httpClient.post('postalOrderPayment/', payload, 3, 'PostalOrderPayment');
  }

  createGroupPostalOrderTransaction(
    penGrpId,
    penGrpDetails,
    type,
    penalties,
    redirectUrl,
    slipNumber,
    postalOrderNumber,
  ) {
    const total = penGrpDetails.splitAmounts.find((a) => a.type === type).amount;
    const penaltiesOfType = penalties.find((p) => p.type === type).penalties;
    const payload = {
      TotalAmount: total,
      PaymentMethod: 'POSTAL_ORDER',
      VehicleRegistration: penGrpDetails.registrationNumber,
      PenaltyGroupId: penGrpId,
      PenaltyType: type,
      RedirectUrl: redirectUrl,
      ReceiptDate: new Date().toISOString().split('T')[0],
      SlipNumber: slipNumber,
      PostalOrderNumber: postalOrderNumber,
      BatchNumber: slipNumber,
      Penalties: penaltiesOfType.map((p) => ({
        PenaltyReference: p.formattedReference,
        PenaltyAmount: p.amount,
        VehicleRegistration: p.vehicleReg,
      })),
    };
    return this.httpClient.post('groupPayment/', payload, 3, 'GroupPostalOrderPayment');
  }

  confirmPayment(receiptReference, penaltyType) {
    const payload = {
      receipt_reference: receiptReference,
      penalty_type: penaltyType,
    };
    return this.httpClient.post('confirm/', payload, 3, 'ConfirmPayment');
  }

  reverseCardPayment(receiptReference, penaltyType, penaltyId) {
    return this.httpClient.post('reverseCard/', {
      receipt_ref: receiptReference,
      penalty_type: penaltyType,
      payment_ref: penaltyId,
    }, 0, 'ReverseCard');
  }

  reverseChequePayment(receiptReference, penaltyType, penaltyId) {
    return this.httpClient.post('reverseCheque/', {
      receipt_ref: receiptReference,
      penalty_type: penaltyType,
      payment_ref: penaltyId,
    }, 0, 'ReverseCheque');
  }

  async getReportTypes(penaltyType = 'FPN') {
    const response = await this.httpClient.post('listReports/', { penalty_type: penaltyType }, 0, 'GetReportTypes');
    if (isEmpty(response.data) || response.data.items === undefined) {
      return [];
    }
    return response.data.items;
  }

  async requestReport(penaltyType, reportCode, fromDate, toDate) {
    const response = await this.httpClient.post('generateReport/', {
      penalty_type: penaltyType,
      report_code: reportCode,
      from_date: fromDate,
      to_date: toDate,
    }, 0, 'RequestReport');
    return response.data;
  }

  async checkReportStatus(penaltyType, reportReference) {
    const response = await this.httpClient.post('checkReportStatus/', {
      penalty_type: penaltyType,
      report_ref: reportReference,
    }, 0, 'CheckReport');
    return response.data;
  }

  async downloadReport(penaltyType, reportReference) {
    const response = await this.httpClient.post('downloadReport/', {
      penalty_type: penaltyType,
      report_ref: reportReference,
    }, 0, 'DownloadReport');

    return response.data;
  }
}
