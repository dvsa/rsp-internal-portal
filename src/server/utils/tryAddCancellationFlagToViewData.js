import { has } from 'lodash';

export default (req, viewData) => {
  if (has(req.query, 'cancellation') && req.query.cancellation === 'failed') {
    return { ...viewData, cancellationFailed: true };
  }
  if (has(req.query, 'reverse') && req.query.reverse === 'failed') {
    return { ...viewData, reverseFailed: true };
  }
  return viewData;
};
