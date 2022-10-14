import moment from 'moment';
import config from '../config';

export const recentPayment = (timeSeconds) => {
  if (timeSeconds) {
    const now = moment(moment.now());
    const paymentTime = moment(timeSeconds * 1000);
    const age = moment.duration(now.diff(paymentTime)).asMilliseconds();
    return age < config.orphanedPaymentCheckingTime();
  }
  return false;
};
