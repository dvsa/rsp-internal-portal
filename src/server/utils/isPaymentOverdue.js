import moment from 'moment';

/**
 * Return false if the payment is still within the valid payment time limit
 * @param {string} dateTime date and time of the penalty. Expected format: 1661855255
 * @param {int} daysLimit number representing how many days from the date of the penalty the fine can be paid
 */
export default function isPaymentOverdue(dateTime, daysLimit) {
  const penaltyDateTime = moment.unix(dateTime);
  if (!penaltyDateTime.isValid()) {
    return true;
  }
  if (moment().isAfter(penaltyDateTime.add(daysLimit, 'd'), 'day')) {
    return true;
  }
  return false;
}
