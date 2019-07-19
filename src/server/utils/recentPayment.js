import moment from 'moment';


const ORPHANED_PAYMENT_CHECKING_TIME = 3.6e6;

export const recentPayment = (time) => {
  if (time) {
    const age = moment.duration(moment(moment.now()).diff(moment(time))).asMilliseconds();
    return age < ORPHANED_PAYMENT_CHECKING_TIME;
  }
  return false;
};
