import moment from 'moment';
import { errorTypes } from '../validation/reports';

/**
 * Validate the submitted dates are no later than today and the endDate
 * is not earlier than the start date.
 * Additionally, CPMS currently does not allow reports to be
 * generated for greater than 28 days.
 * @param {string} startDateText End date in the format yyyy-mm-dd
 * @param {string} endDateText Start date in the format yyyy-mm-dd
 */

export default function validDateRange(startDateText, endDateText) {
  const dateToday = moment().startOf('day');
  const startDate = moment(startDateText);
  if (!startDate.isValid()) {
    return { isValid: false, type: errorTypes.invalidDateEntry };
  }
  const endDate = moment(endDateText);
  if (!endDate.isValid()) {
    return { isValid: false, type: errorTypes.invalidDateEntry };
  }
  const endAfterStart = endDate.isSameOrAfter(startDate);
  if (!endAfterStart) {
    return { isValid: false, type: errorTypes.startAfterEnd };
  }

  const dateNotInFuture = dateToday.isSameOrAfter(endDate);
  if (!dateNotInFuture) {
    return { isValid: false, type: errorTypes.dateInFuture };
  }

  const over28Days = endDate.diff(startDate, 'days') > 28;
  if (over28Days) {
    return { isValid: false, type: errorTypes.over28Days };
  }

  return { isValid: true };
}
