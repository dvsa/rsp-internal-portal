import { validationResult } from 'express-validator/check';
import paymentCodeValidation from './../validation/paymentCode';
import PenaltyService from './../services/penalty.service';
import config from '../config';

const penaltyService = new PenaltyService(config.penaltyServiceUrl);

// Removes all non-alphanumeric characters and converts to lowercase
export const normalizePaymentcode = (req, res, next) => {
  req.body.payment_code = req.body.payment_code.replace(/\W|_/g, '').toLowerCase();
  next();
};

export const validatePaymentCode = [
  normalizePaymentcode,
  paymentCodeValidation,
];

export const getPenaltyDetails = [
  paymentCodeValidation,
  (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.redirect('../?invalidPaymentCode');
    } else {
      const paymentCode = req.params.payment_code;

      penaltyService.getByPaymentCode(paymentCode).then((details) => {
        res.render('penalty/penaltyDetails', details);
      }).catch(() => {
        res.redirect('../?invalidPaymentCode');
      });
    }
  },
];
