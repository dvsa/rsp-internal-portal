/* eslint-disable no-use-before-define */
import { validationResult } from 'express-validator/check';
import { has } from 'lodash';
import penaltyReferenceValidation from './../validation/penaltyReference';
import PenaltyService from './../services/penalty.service';
import config from '../config';

const penaltyService = new PenaltyService(config.penaltyServiceUrl);

export const validatePenaltyReference = [
  penaltyReferenceValidation,
];

export const getPenaltyDetails = [
  validatePenaltyReference,
  (req, res) => {
    const errors = validationResult(req);
    const penaltyType = req.params.penalty_id.split('_').pop();

    if (!errors.isEmpty()) {
      res.redirect(`../?invalid${penaltyType}`);
    } else {
      const penaltyId = req.params.penalty_id;

      penaltyService.getById(penaltyId).then((penaltyDetails) => {
        const viewData = tryAddCancellationFlag(req, penaltyDetails);
        res.render('penalty/penaltyDetails', viewData);
      }).catch(() => {
        res.redirect(`../?invalid${penaltyType}`);
      });
    }
  },
];

const tryAddCancellationFlag = (req, viewData) => {
  if (has(req.query, 'cancellation') && req.query.cancellation === 'failed') {
    return { ...viewData, cancellationFailed: true };
  }
  return viewData;
};

export const cancelPenalty = async (req, res) => {
  const penaltyId = req.params.penalty_id;
  try {
    await penaltyService.cancel(penaltyId);
    res.redirect(`/penalty/${penaltyId}`);
  } catch (error) {
    console.log(error);
    res.redirect(`/penalty/${penaltyId}?cancellation=failed`);
  }
};
