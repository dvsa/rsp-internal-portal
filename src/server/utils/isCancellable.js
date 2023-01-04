import { recentPayment } from './recentPayment';

/**
 * Return false if any of the conditions fail, meaning the payment
 * should be unable to be cancelled
 * @param {string} paymentStatus whether the penalty is PAID or UNPAID
 * @param {boolean} activePenalty whether the penalty is enabled in the database
 * @param {float} paymentStartTime when (if) the user began paying the penalty
 */

export function isCancellable(paymentStatus, activePenalty, paymentStartTime) {
  if (paymentStatus !== 'UNPAID') {
    return false;
  }
  if (activePenalty !== true) {
    return false;
  }
  if (recentPayment(paymentStartTime)) {
    return false;
  }
  return true;
}
