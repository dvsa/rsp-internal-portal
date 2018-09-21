/* eslint-disable no-use-before-define */
import { validationResult } from 'express-validator/check';
import { has } from 'lodash';
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
    let view;
    let viewData;
    try {
      const paymentCode = req.params.payment_code;

      if (paymentCode.length === 16) {
        const penalty = await penaltyService.getByPaymentCode(paymentCode);
        view = 'penalty/penaltyDetails';
        viewData = penalty;
      } else {
        const penaltyGroup = await penaltyGroupService.getByPaymentCode(paymentCode);
        view = 'penalty/penaltyGroupSummary';
        viewData = penaltyGroup;
      }
    } catch (error) {
      logger.error(error);
      res.redirect('../?invalidPaymentCode');
    }

    const finalViewData = checkAndSetCancellationFailureFlag(req, viewData);
    res.render(view, finalViewData);
  },
];

const checkAndSetCancellationFailureFlag = (req, viewData) => {
  if (has(req.query, 'cancellation') && req.query.cancellation === 'failed') {
    return { ...viewData, cancellationFailed: true };
  }
  return viewData;
};

export const getPenaltyGroupBreakdownForType = [
  (req, res) => {
    const paymentCode = req.params.payment_code;
    const { type } = req.params;
    penaltyGroupService.getPaymentsByCodeAndType(paymentCode, type).then((penaltiesForType) => {
      res.render('payment/penaltyGroupTypeBreakdown', { paymentCode, ...penaltiesForType });
    }).catch((error) => {
      logger.error(error);
      res.redirect('../payment-code?invalidPaymentCode');
    });
  },
];

export const cancelPaymentCode = async (req, res) => {
  const paymentCode = req.params.payment_code;
  try {
    await penaltyGroupService.cancel(paymentCode);
    res.redirect(`/payment-code/${paymentCode}`);
  } catch (error) {
    console.log(error);
    res.redirect(`/payment-code/${paymentCode}?cancellation=failed`);
  }
};
