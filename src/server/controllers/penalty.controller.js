/* eslint-disable no-use-before-define */
import { validationResult } from 'express-validator/check';
import penaltyReferenceValidation from './../validation/penaltyReference';
import PenaltyService from './../services/penalty.service';
import config from '../config';
import tryAddCancellationFlagToViewData from '../utils/tryAddCancellationFlagToViewData';
import { logInfo } from '../utils/logger';

const penaltyService = new PenaltyService(config.penaltyServiceUrl());

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
        const viewData = tryAddCancellationFlagToViewData(req, penaltyDetails);
        res.render('penalty/penaltyDetails', { ...viewData, ...req.session });
      }).catch(() => {
        res.redirect(`../?invalid${penaltyType}`);
      });
    }
  },
];

export const cancelPenalty = async (req, res) => {
  const penaltyId = req.params.penalty_id;
  logInfo('CancelPenalty', {
    userEmail: req.session.rsp_user.email,
    penaltyId,
  });
  try {
    await penaltyService.cancel(penaltyId);
    res.redirect(`${config.urlRoot()}/penalty/${penaltyId}`);
  } catch (error) {
    res.redirect(`${config.urlRoot()}/penalty/${penaltyId}?cancellation=failed`);
  }
};
