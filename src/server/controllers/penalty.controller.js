import { validationResult } from 'express-validator/check';
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

      penaltyService.getById(penaltyId).then((details) => {
        res.render('penalty/penaltyDetails', { ...details, ...req.session });
      }).catch(() => {
        res.redirect(`../?invalid${penaltyType}`);
      });
    }
  },
];
