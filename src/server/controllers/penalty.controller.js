/* eslint-disable no-use-before-define */
import { validationResult } from 'express-validator';
import penaltyReferenceValidation from '../validation/penaltyReference';
import PenaltyService from '../services/penalty.service';
import config from '../config';
import tryAddCancellationFlagToViewData from '../utils/tryAddCancellationFlagToViewData';
import { logInfo, logError } from '../utils/logger';
import { recentPayment } from '../utils/recentPayment';

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
        res.render('penalty/penaltyDetails', {
          ...viewData,
          ...req.session,
          isCancellable:
            penaltyDetails.status === 'UNPAID'
            && penaltyDetails.enabled === true
            && !recentPayment(penaltyDetails.paymentStartTime),
        });
      }).catch(() => {
        res.redirect(`../?invalid${penaltyType}`);
      });
    }
  },
];

export const cancelPenalty = async (req, res) => {
  const penaltyId = req.params.penalty_id;
  const logMessage = {
    userEmail: req.session.rsp_user.email,
    userRole: req.session.rsp_user_role,
    penaltyId,
  };
  try {
    await penaltyService.cancel(penaltyId);
    logInfo('cancelPenaltySuccess', logMessage);
    res.redirect(`${config.urlRoot()}/penalty/${penaltyId}`);
  } catch (error) {
    logError('cancelPenaltyError', {
      ...logMessage,
      error: error.message,
    });
    res.redirect(`${config.urlRoot()}/penalty/${penaltyId}?cancellation=failed`);
  }
};
