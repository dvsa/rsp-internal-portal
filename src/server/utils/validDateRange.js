import moment from 'moment';

/**
 * Validate the submitted dates are no later than today and the endDate
 * is not earlier than the start date.
 * @param {string} startDateText End date in the format yyyy-mm-dd
 * @param {string} endDateText Start date in the format yyyy-mm-dd
 */
export default function validDateRange(startDateText, endDateText) {
  const dateToday = moment().startOf('day');
  const startDate = moment(startDateText);
  const endDate = moment(endDateText);
  const endAfterStart = endDate.isSameOrAfter(startDate);
  const dateNotInFuture = dateToday.isSameOrAfter(endDate);

  return dateNotInFuture && endAfterStart;
}
