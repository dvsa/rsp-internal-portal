export function isReversible(paymentStatus, paymentDate) {
  if (paymentStatus === 'PAID') {
    if (paymentDate) {
      const todaysDate = new Date().setHours(0, 0, 0, 0);
      const formatPaymentDate = new Date(paymentDate * 1000).setHours(0, 0, 0, 0);
      return todaysDate > formatPaymentDate;
    }
  }

  return false;
}
