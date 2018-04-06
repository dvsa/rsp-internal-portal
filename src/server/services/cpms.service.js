import createHttpClient from './../utils/httpclient';

export default class PaymentService {
  constructor(serviceUrl) {
    this.httpClient = createHttpClient(serviceUrl);
  }

  createCardNotPresentTransaction(vehicleReg, penaltyReference, penaltyType, amount, redirectUrl) {
    return this.httpClient.post('cardNotPresentPayment/', JSON.stringify({
      penalty_reference: penaltyReference,
      penalty_type: penaltyType,
      penalty_amount: amount,
      redirect_url: redirectUrl,
      vehicle_reg: vehicleReg,
    }));
  }

  createCashTransaction(vehicleReg, penaltyReference, penaltyType, amount, slipNumber) {
    return this.httpClient.post('cashPayment/', JSON.stringify({
      penalty_reference: penaltyReference,
      penalty_type: penaltyType,
      penalty_amount: amount,
      slip_number: slipNumber,
      receipt_date: new Date().toISOString().split('T')[0],
      batch_number: 1,
      vehicle_reg: vehicleReg,
    }));
  }

  createChequeTransaction(
    vehicleReg, penaltyReference, penaltyType, amount,
    slipNumber, chequeDate, chequeNumber, nameOnCheque,
  ) {
    return this.httpClient.post('chequePayment/', JSON.stringify({
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
    }));
  }

  createPostalOrderTransaction(
    vehicleReg, penaltyReference, penaltyType, amount,
    slipNumber, postalOrderNumber,
  ) {
    return this.httpClient.post('postalOrderPayment/', JSON.stringify({
      penalty_reference: penaltyReference,
      penalty_type: penaltyType,
      penalty_amount: amount,
      slip_number: slipNumber,
      receipt_date: new Date().toISOString().split('T')[0],
      batch_number: 1,
      postal_order_number: postalOrderNumber,
      vehicle_reg: vehicleReg,
    }));
  }

  confirmPayment(receiptReference, penaltyType) {
    return this.httpClient.post('confirm/', JSON.stringify({
      receipt_reference: receiptReference,
      penalty_type: penaltyType,
    }));
  }
}
