import { validationResult } from 'express-validator/check';
import penaltyReferenceValidation from './../validation/penaltyReference';
import PenaltyService from './../services/penalty.service';

const penaltyService = new PenaltyService();

// Robots
export const robots = (req, res) => {
  res.type('text/plain');
  res.send('User-agent: *\nDisallow: /');
};

export const validatePenaltyReference = [
  penaltyReferenceValidation,
];

export const getPenaltyDetails = [
  validatePenaltyReference,
  (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.redirect('../?invalidPenaltyReference');
    } else {
      const penaltyReference = req.params.penalty_ref;

      penaltyService.getByReference(penaltyReference).then((details) => {
        res.render('penalty/penaltyDetails', details);
      }).catch(() => {
        res.redirect('../?invalidPenaltyReference');
      });
    }
  },
];
