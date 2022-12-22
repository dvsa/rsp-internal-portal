export const errorTypes = {
  startAfterEnd: 'startAfterEnd',
  dateInFuture: 'dateInFuture',
  over28Days: 'over28Days',
  cpmsError: 'cpmsError',
  invalidDateEntry: 'invalidDateEntry',
};

export const errorMessages = {
  startAfterEnd: 'The from date cannot be after the to date.',
  dateInFuture: 'Dates cannot be in the future.',
  over28Days: 'Reports over 28 days cannot be generated.',
  cpmsError: 'There was a server error. Please try again later.',
  invalidDateEntry: 'One or more dates entered was invalid.',
};