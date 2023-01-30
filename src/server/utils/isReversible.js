export function isReversible(paymentStatus, paymentDate, paymentType) {
  if (paymentStatus === 'PAID') {
    if (paymentType === 'CNP' || paymentType === 'CARD' || paymentType === 'CHEQUE') {
      if (paymentDate) {
        const todaysDate = new Date().setHours(0, 0, 0, 0);
        const formatPaymentDate = new Date(paymentDate * 1000).setHours(0, 0, 0, 0);
        return todaysDate > formatPaymentDate;
      }
    }
    return true;
  }

  return false;
}
