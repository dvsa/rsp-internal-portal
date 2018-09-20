import { validationResult } from 'express-validator/check';
import paymentCodeValidation from './../validation/paymentCode';
import PenaltyService from './../services/penalty.service';
import config from './../config';
import logger from './../utils/logger';
import PenaltyGroupService from '../services/penaltyGroup.service';

const penaltyService = new PenaltyService(config.penaltyServiceUrl);
const penaltyGroupService = new PenaltyGroupService(config.penaltyServiceUrl);

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
  async (req, res) => {
    try {
      const paymentCode = req.params.payment_code;
      let penaltyOrGroup;

      if (paymentCode.length === 16) {
        penaltyOrGroup = await penaltyService.getByPaymentCode(paymentCode);
        res.render('penalty/penaltyDetails', {
          ...penaltyOrGroup,
          ...req.session,
        });
      } else {
        penaltyOrGroup = await penaltyGroupService.getByPaymentCode(paymentCode);
        res.render('penalty/penaltyGroupSummary', {
          ...penaltyOrGroup,
          ...req.session,
        });
      }
    } catch (error) {
      logger.error(error);
      res.redirect('../?invalidPaymentCode');
    }
  },
];

export const getPenaltyGroupBreakdownForType = [
  (req, res) => {
    const paymentCode = req.params.payment_code;
    const { type } = req.params;
    penaltyGroupService.getPaymentsByCodeAndType(paymentCode, type).then((penaltiesForType) => {
      res.render('payment/penaltyGroupTypeBreakdown', { paymentCode, ...penaltiesForType, ...req.session });
    }).catch((error) => {
      logger.error(error);
      res.redirect('../payment-code?invalidPaymentCode');
    });
  },
];
