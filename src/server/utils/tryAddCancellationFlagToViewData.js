import { has } from 'lodash';

export default (req, viewData) => {
  if (has(req.query, 'cancellation') && req.query.cancellation === 'failed') {
    return { ...viewData, cancellationFailed: true };
  }
  return viewData;
};
