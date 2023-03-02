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
      logError('getPenaltyDetails', {
        message: 'Error getting penalty details by code',
        paymentCode,
        error: error.message,
      });
      return res.redirect(`${config.urlRoot()}/?invalidPaymentCode`);
    }

    const finalViewData = {
      ...tryAddCancellationFlagToViewData(req, viewData),
      ...req.session,
    };
    return res.render(view, finalViewData);
  },
];

export const getPenaltyGroupBreakdownForType = [
  (req, res) => {
    const paymentCode = req.params.payment_code;
    const { type } = req.params;
    penaltyGroupService.getPaymentsByCodeAndType(paymentCode, type).then((penaltiesForType) => {
      if (penaltiesForType.isPaymentOverdue) {
        logInfo('getPenaltyGroupBreakdownForType', {
          message: 'Payment is overdue. Redirect to penalty details page.',
        });
        return res.redirect(`${config.urlRoot()}/payment-code/${paymentCode}`);
      }
      return res.render('payment/penaltyGroupTypeBreakdown', { paymentCode, ...penaltiesForType, ...req.session });
    }).catch((err) => {
      logError('getPenaltyGroupBreakdownForTypeError', {
        error: err.message,
      });
      return res.redirect(`${config.urlRoot()}/payment-code?invalidPaymentCode`);
    });
  },
];

export const cancelPaymentCode = async (req, res) => {
  const paymentCode = req.params.payment_code;
  const logMessage = {
    userEmail: req.session.rsp_user.email,
    userRole: req.session.rsp_user_role,
    paymentCode,
  };
  try {
    await penaltyGroupService.cancel(paymentCode);
    logInfo('cancelPenaltyGroupSuccess', logMessage);
    res.redirect(`${config.urlRoot()}/payment-code/${paymentCode}`);
  } catch (error) {
    logError('cancelPenaltyGroupError', {
      ...logMessage,
      error: error.message,
    });
    res.redirect(`${config.urlRoot()}/payment-code/${paymentCode}?cancellation=failed`);
  }
};
