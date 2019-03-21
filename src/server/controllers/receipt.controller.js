/* eslint-disable no-use-before-define */

import moment from 'moment-timezone';

import config from '../config';
import logger from '../utils/logger';
import PenaltyGroupService from '../services/penaltyGroup.service';
import PaymentService from '../services/payment.service';
import { MOMENT_DATE_FORMAT, MOMENT_TIME_FORMAT, MOMENT_TIMEZONE } from '../utils/dateTimeFormat';

const penaltyGroupService = new PenaltyGroupService(config.penaltyServiceUrl());
const paymentService = new PaymentService(config.paymentServiceUrl());

export default async (req, res) => {
  try {
    const paymentCode = req.params.payment_code;
    const { type } = req.params;

    if (!isValidPaymentPaymentType(type)) {
      return res.redirect(`${config.urlRoot()}/?invalidPaymentCode`);
    }

    const penaltyGroup = await penaltyGroupService.getByPaymentCode(paymentCode);
    const paymentDetails = (await paymentService.getGroupPayment(paymentCode)).data;
    const enrichedPaymentDetails = addFormattedPaymentDateTimes(paymentDetails);

    const resp = {
      paymentType: req.params.type,
      paymentDetails: enrichedPaymentDetails,
      ...penaltyGroup,
    };
    return res.render('payment/multiPaymentReceipt', { ...resp, ...req.session });
  } catch (error) {
    logger.error(error);
    return res.redirect(`${config.urlRoot()}/?invalidPaymentCode`);
  }
};

function isValidPaymentPaymentType(type) {
  return ['FPN', 'CDN', 'IM'].includes(type);
}

function addFormattedPaymentDateTimes(paymentDetails) {
  const newPaymentDetails = { ...paymentDetails };
  newPaymentDetails.Payments = Object.keys(newPaymentDetails.Payments).reduce((acc, type) => {
    const timestamp = newPaymentDetails.Payments[type].PaymentDate * 1000;
    acc[type] = {
      FormattedDate: moment.tz(timestamp, MOMENT_TIMEZONE).format(MOMENT_DATE_FORMAT),
      FormattedTime: moment.tz(timestamp, MOMENT_TIMEZONE).format(MOMENT_TIME_FORMAT),
      ...newPaymentDetails.Payments[type],
    };
    return acc;
  }, {});
  return newPaymentDetails;
}
