import { isEmpty } from 'lodash';
import SignedHttpClient from './../utils/httpclient';

export default class PaymentService {
  constructor(serviceUrl) {
    this.httpClient = new SignedHttpClient(serviceUrl);
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
    return this.httpClient.post('cardNotPresentPayment/', payload, 3);
  }

  createCardNotPresentGroupTransaction(penGrpId, penGrpDetails, type, penalties, redirectUrl) {
    const total = penGrpDetails.splitAmounts.find(a => a.type === type).amount;
    const payload = {
      TotalAmount: total,
      PaymentMethod: 'CNP',
      VehicleRegistration: penGrpDetails.registrationNumber,
      PenaltyGroupId: penGrpId,
      PenaltyType: type,
      RedirectUrl: redirectUrl,
      Penalties: penalties.map(p => ({
        PenaltyReference: p.reference,
        PenaltyAmount: p.amount,
        VehicleRegistration: p.vehicleReg,
      })),
    };
    return this.httpClient.post('groupPayment/', payload, 3);
  }

  createCashTransaction(paymentCode, reg, penaltyRef, penaltyType, amount, slipNumber) {
    const payload = {
      payment_code: paymentCode,
      penalty_reference: penaltyRef,
      penalty_type: penaltyType,
      penalty_amount: amount,
      slip_number: slipNumber,
      receipt_date: new Date().toISOString().split('T')[0],
      batch_number: 1,
      vehicle_reg: reg,
    };
    return this.httpClient.post('cashPayment/', payload, 3);
  }

  createGroupCashTransaction(penGrpId, penGrpDetails, type, penalties, redirectUrl, slipNumber) {
    const total = penGrpDetails.splitAmounts.find(a => a.type === type).amount;
    const penaltiesOfType = penalties.find(p => p.type === type).penalties;

    const payload = {
      TotalAmount: total,
      PaymentMethod: 'CASH',
      VehicleRegistration: penGrpDetails.registrationNumber,
      PenaltyGroupId: penGrpId,
      PenaltyType: type,
      RedirectUrl: redirectUrl,
      SlipNumber: slipNumber,
      ReceiptDate: new Date().toISOString().split('T')[0],
      BatchNumber: '1',
      Penalties: penaltiesOfType.map(p => ({
        PenaltyReference: p.reference,
        PenaltyAmount: p.amount,
        VehicleRegistration: p.vehicleReg,
      })),
    };
    return this.httpClient.post('groupPayment/', payload, 3);
  }

  createChequeTransaction(
    paymentCode, vehicleReg, penaltyReference, penaltyType, amount,
    slipNumber, chequeDate, chequeNumber, nameOnCheque,
  ) {
    const payload = {
      payment_code: paymentCode,
      penalty_reference: penaltyReference,
      penalty_type: penaltyType,
      penalty_amount: amount,
      slip_number: slipNumber,
      receipt_date: new Date().toISOString().split('T')[0],
      batch_number: 1,
      cheque_date: chequeDate,
      cheque_number: chequeNumber,
      name_on_cheque: nameOnCheque,
      vehicle_reg: vehicleReg,
    };
    return this.httpClient.post('chequePayment/', payload, 3);
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
    const total = penGrpDetails.splitAmounts.find(a => a.type === type).amount;
    const penaltiesOfType = penalties.find(p => p.type === type).penalties;
    const payload = {
      TotalAmount: total,
      PaymentMethod: 'CHEQUE',
      VehicleRegistration: penGrpDetails.registrationNumber,
      PenaltyGroupId: penGrpId,
      PenaltyType: type,
      RedirectUrl: redirectUrl,
      ReceiptDate: new Date().toISOString().split('T')[0],
      SlipNumber: slipNumber,
      BatchNumber: '1',
      ChequeNumber: chequeNumber,
      ChequeDate: chequeDate,
      NameOnCheque: nameOnCheque,
      Penalties: penaltiesOfType.map(p => ({
        PenaltyReference: p.reference,
        PenaltyAmount: p.amount,
        VehicleRegistration: p.vehicleReg,
      })),
    };
    return this.httpClient.post('groupPayment/', payload, 3);
  }

  createPostalOrderTransaction(
    paymentCode, vehicleReg, penaltyReference, penaltyType, amount,
    slipNumber, postalOrderNumber,
  ) {
    const payload = {
      payment_code: paymentCode,
      penalty_reference: penaltyReference,
      penalty_type: penaltyType,
      penalty_amount: amount,
      slip_number: slipNumber,
      receipt_date: new Date().toISOString().split('T')[0],
      batch_number: 1,
      postal_order_number: postalOrderNumber,
      vehicle_reg: vehicleReg,
    };
    return this.httpClient.post('postalOrderPayment/', payload, 3);
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
    const total = penGrpDetails.splitAmounts.find(a => a.type === type).amount;
    const penaltiesOfType = penalties.find(p => p.type === type).penalties;
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
      BatchNumber: '1',
      Penalties: penaltiesOfType.map(p => ({
        PenaltyReference: p.reference,
        PenaltyAmount: p.amount,
        VehicleRegistration: p.vehicleReg,
      })),
    };
    return this.httpClient.post('groupPayment/', payload, 3);
  }

  confirmPayment(receiptReference, penaltyType) {
    const payload = {
      receipt_reference: receiptReference,
      penalty_type: penaltyType,
    };
    return this.httpClient.post('confirm/', payload, 3);
  }

  reverseCardPayment(receiptReference, penaltyType, penaltyId) {
    return this.httpClient.post('reverseCard/', {
      receipt_ref: receiptReference,
      penalty_type: penaltyType,
      payment_ref: penaltyId,
    });
  }

  reverseChequePayment(receiptReference, penaltyType, penaltyId) {
    return this.httpClient.post('reverseCheque/', {
      receipt_ref: receiptReference,
      penalty_type: penaltyType,
      payment_ref: penaltyId,
    });
  }

  getReportTypes(penaltyType = 'FPN') {
    const promise = new Promise((resolve, reject) => {
      this.httpClient.post('listReports/', { penalty_type: penaltyType }).then((response) => {
        if (isEmpty(response.data) || response.data.items === undefined) {
          resolve([]);
        }
        resolve(response.data.items);
      }).catch((error) => {
        reject(new Error(error));
      });
    });
    return promise;
  }

  requestReport(penaltyType, reportCode, fromDate, toDate) {
    const promise = new Promise((resolve, reject) => {
      this.httpClient.post('generateReport/', {
        penalty_type: penaltyType,
        report_code: reportCode,
        from_date: fromDate,
        to_date: toDate,
      }).then((response) => {
        resolve(response.data);
      }).catch((error) => {
        reject(new Error(error));
      });
    });
    return promise;
  }

  checkReportStatus(penaltyType, reportReference) {
    const promise = new Promise((resolve, reject) => {
      this.httpClient.post('checkReportStatus/', {
        penalty_type: penaltyType,
        report_ref: reportReference,
      }).then((response) => {
        resolve(response.data);
      }).catch((error) => {
        reject(new Error(error));
      });
    });
    return promise;
  }

  downloadReport(penaltyType, reportReference) {
    const promise = new Promise((resolve, reject) => {
      this.httpClient.post('downloadReport/', {
        penalty_type: penaltyType,
        report_ref: reportReference,
      }).then((response) => {
        resolve(response.data);
      }).catch((error) => {
        reject(new Error(error));
      });
    });
    return promise;
  }
}
