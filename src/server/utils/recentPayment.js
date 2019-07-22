import moment from 'moment';
import config from '../config';


export const recentPayment = (timeSeconds) => {
  if (timeSeconds) {
    const age = moment.duration(moment(moment.now()).diff(moment(timeSeconds * 1000))).asMilliseconds();
    return age < config.orphanedPaymentCheckingTime();
  }
  return false;
};
