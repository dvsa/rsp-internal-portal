import { validationResult } from 'express-validator/check';
import paymentCodeValidation from './../validation/paymentCode';
import PenaltyService from './../services/penalty.service';
import config from './../config';
import logger from './../utils/logger';

const penaltyService = new PenaltyService(config.penaltyServiceUrl);

// Removes all non-alphanumeric characters and converts to lowercase
export const normalizePaymentcode = (req, res, next) => {
  if (req.body.payment_code) {
    req.body.payment_code = req.body.payment_code.replace(/\W|_/g, '').toLowerCase();
  }
  next();
};

export const validatePaymentCode = [
  normalizePaymentcode,
  paymentCodeValidation,
  (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      logger.error(errors.mapped());
      res.redirect('../../?invalidPaymentCode');
    } else {
      next();
    }
  },
];

export const getPenaltyDetails = [
  paymentCodeValidation,
  (req, res) => {
    const paymentCode = req.params.payment_code;
    penaltyService.getByPaymentCode(paymentCode).then((details) => {
      res.render('penalty/penaltyDetails', details);
    }).catch((error) => {
      logger.error(error);
      res.redirect('../?invalidPaymentCode');
    });
  },
];
