import { isEmpty } from 'lodash';
import SignedHttpClient from './../utils/httpclient';

export default class PaymentService {
  constructor(serviceUrl) {
    this.httpClient = new SignedHttpClient(serviceUrl);
  }

  createCardNotPresentTransaction(vehicleReg, penaltyReference, penaltyType, amount, redirectUrl) {
    return this.httpClient.post('cardNotPresentPayment/', {
      penalty_reference: penaltyReference,
      penalty_type: penaltyType,
      penalty_amount: amount,
      redirect_url: redirectUrl,
      vehicle_reg: vehicleReg,
    });
  }

  createCardNotPresentGroupTransaction(penGrpId, penGrpDetails, type, penalties, redirectUrl) {
    const total = penGrpDetails.splitAmounts.find(a => a.type === type).amount;
    return this.httpClient.post('groupPayment/', {
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
    });
  }

  createCashTransaction(vehicleReg, penaltyReference, penaltyType, amount, slipNumber) {
    return this.httpClient.post('cashPayment/', {
      penalty_reference: penaltyReference,
      penalty_type: penaltyType,
      penalty_amount: amount,
      slip_number: slipNumber,
      receipt_date: new Date().toISOString().split('T')[0],
      batch_number: 1,
      vehicle_reg: vehicleReg,
    });
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
      BatchNumber: 1,
      Penalties: penaltiesOfType.map(p => ({
        PenaltyReference: p.reference,
        PenaltyAmount: p.amount,
        VehicleRegistration: p.vehicleReg,
      })),
    };
    return this.httpClient.post('groupPayment/', payload);
  }

  createChequeTransaction(
    vehicleReg, penaltyReference, penaltyType, amount,
    slipNumber, chequeDate, chequeNumber, nameOnCheque,
  ) {
    return this.httpClient.post('chequePayment/', {
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
    });
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
      PaymentMethod: 'CASH',
      VehicleRegistration: penGrpDetails.registrationNumber,
      PenaltyGroupId: penGrpId,
      PenaltyType: type,
      RedirectUrl: redirectUrl,
      ReceiptDate: new Date().toISOString().split('T')[0],
      SlipNumber: slipNumber,
      BatchNumber: 1,
      ChequeNumber: chequeNumber,
      ChequeDate: chequeDate,
      NameOnCheque: nameOnCheque,
      Penalties: penaltiesOfType.map(p => ({
        PenaltyReference: p.reference,
        PenaltyAmount: p.amount,
        VehicleRegistration: p.vehicleReg,
      })),
    };
    return this.httpClient.post('groupPayment/', payload);
  }

  createPostalOrderTransaction(
    vehicleReg, penaltyReference, penaltyType, amount,
    slipNumber, postalOrderNumber,
  ) {
    return this.httpClient.post('postalOrderPayment/', {
      penalty_reference: penaltyReference,
      penalty_type: penaltyType,
      penalty_amount: amount,
      slip_number: slipNumber,
      receipt_date: new Date().toISOString().split('T')[0],
      batch_number: 1,
      postal_order_number: postalOrderNumber,
      vehicle_reg: vehicleReg,
    });
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
      PaymentMethod: 'CASH',
      VehicleRegistration: penGrpDetails.registrationNumber,
      PenaltyGroupId: penGrpId,
      PenaltyType: type,
      RedirectUrl: redirectUrl,
      ReceiptDate: new Date().toISOString().split('T')[0],
      SlipNumber: slipNumber,
      PostalOrderNumber: postalOrderNumber,
      BatchNumber: 1,
      Penalties: penaltiesOfType.map(p => ({
        PenaltyReference: p.reference,
        PenaltyAmount: p.amount,
        VehicleRegistration: p.vehicleReg,
      })),
    };
    return this.httpClient.post('groupPayment/', payload);
  }

  confirmPayment(receiptReference, penaltyType) {
    return this.httpClient.post('confirm/', {
      receipt_reference: receiptReference,
      penalty_type: penaltyType,
    });
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
