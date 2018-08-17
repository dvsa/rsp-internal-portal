/* eslint-disable no-use-before-define */

import moment from 'moment-timezone';

import config from '../config';
import logger from '../utils/logger';
import PenaltyGroupService from '../services/penaltyGroup.service';
import PaymentService from '../services/payment.service';

const penaltyGroupService = new PenaltyGroupService(config.penaltyServiceUrl);
const paymentService = new PaymentService(config.paymentServiceUrl);

export default async (req, res) => {
  try {
    const paymentCode = req.params.payment_code;
    const { type } = req.params;

    if (!isValidPaymentPaymentType(type)) {
      return res.redirect(`${config.urlRoot}/?invalidPaymentCode`);
    }

    const penaltyGroup = await penaltyGroupService.getByPaymentCode(paymentCode);
    const paymentDetails = (await paymentService.getGroupPayment(paymentCode)).data;
    const enrichedPaymentDetails = addFormattedPaymentDateTimes(paymentDetails);

    const resp = {
      paymentType: req.params.type,
      paymentDetails: enrichedPaymentDetails,
      ...penaltyGroup,
    };
    return res.render('payment/multiPaymentReceipt', resp);
  } catch (error) {
    logger.error(error);
    return res.redirect(`${config.urlRoot}/?invalidPaymentCode`);
  }
};

function isValidPaymentPaymentType(type) {
  return ['FPN', 'CDN', 'IM'].includes(type);
}

function addFormattedPaymentDateTimes(paymentDetails) {
  const newPaymentDetails = { ...paymentDetails };
  newPaymentDetails.Payments = Object.keys(newPaymentDetails.Payments).reduce((acc, type) => {
    const timestamp = newPaymentDetails.Payments[type].PaymentDate * 1000;
    const timezoneId = 'Europe/London';
    acc[type] = {
      FormattedDate: moment.tz(timestamp, timezoneId).format('DD/MM/YYYY'),
      FormattedTime: moment.tz(timestamp, timezoneId).format('h:mma'),
      ...newPaymentDetails.Payments[type],
    };
    return acc;
  }, {});
  return newPaymentDetails;
}
