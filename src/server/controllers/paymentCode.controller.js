/* eslint-disable no-use-before-define */
import { validationResult } from 'express-validator';
import paymentCodeValidation from '../validation/paymentCode';
import PenaltyService from '../services/penalty.service';
import config from '../config';
import { logError, logInfo } from '../utils/logger';
import PenaltyGroupService from '../services/penaltyGroup.service';
import tryAddCancellationFlagToViewData from '../utils/tryAddCancellationFlagToViewData';

const penaltyService = new PenaltyService(config.penaltyServiceUrl());
const penaltyGroupService = new PenaltyGroupService(config.penaltyServiceUrl());

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
      logError('PaymentValidationError', errors);
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
    const paymentCode = req.params.payment_code;
    try {
      if (paymentCode.length === 16) {
        const penalty = await penaltyService.getByPaymentCode(paymentCode);
        view = 'penalty/penaltyDetails';
        viewData = penalty;
      } else {
        const penaltyGroup = await penaltyGroupService.getByPaymentCode(paymentCode);
        view = 'penalty/penaltyGroupSummary';
        viewData = {
          ...penaltyGroup,
          location: penaltyGroup.penaltyDetails[0].penalties[0].location,
        };
      }
    } catch (error) {
      res.redirect('../?invalidPaymentCode');
    }

    const finalViewData = {
      ...tryAddCancellationFlagToViewData(req, viewData),
      ...req.session,
    };
    res.render(view, finalViewData);
  },
];

export const getPenaltyGroupBreakdownForType = [
  (req, res) => {
    const paymentCode = req.params.payment_code;
    const { type } = req.params;
    penaltyGroupService.getPaymentsByCodeAndType(paymentCode, type).then((penaltiesForType) => {
      res.render('payment/penaltyGroupTypeBreakdown', { paymentCode, ...penaltiesForType, ...req.session });
    }).catch(() => {
      res.redirect('../payment-code?invalidPaymentCode');
    });
  },
];

export const cancelPaymentCode = async (req, res) => {
  const paymentCode = req.params.payment_code;
  logInfo('CancelPaymentCode', {
    userEmail: req.session.rsp_user.email,
    userRole: req.session.rsp_user_role,
    paymentCode,
  });
  try {
    await penaltyGroupService.cancel(paymentCode);
    logInfo('cancelPaymentCodeSuccess', { paymentCode });
    res.redirect(`${config.urlRoot()}/payment-code/${paymentCode}`);
  } catch (error) {
    logError('cancelPaymentCodeError', { paymentCode, error });
    res.redirect(`${config.urlRoot()}/payment-code/${paymentCode}?cancellation=failed`);
  }
};
