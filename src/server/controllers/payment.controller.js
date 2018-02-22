import { check, validationResult } from 'express-validator/check';
import PaymentService from './../services/payment.service';

const paymentService = new PaymentService();

// Robots
export const robots = (req, res) => {
  res.type('text/plain');
  res.send('User-agent: *\nDisallow: /');
};

// Index Route
export const index = (req, res) => {
  if (Object.keys(req.query).some(param => param === 'invalidPaymentCode')) {
    return res.render('payment/index', { invalidPaymentCode: true });
  }
  return res.render('payment/index');
};

// Removes all non-alphanumeric characters and converts to lowercase
export const normalizePaymentcode = (req, res, next) => {
  req.body.payment_code = req.body.payment_code.replace(/\W|_/g, '').toLowerCase();
  next();
};

export const paymentCodeValidationChecks = [
  check('payment_code').isLength({ min: 16, max: 16 }),
  check('payment_code').trim().isHexadecimal(),
];

export const validatePaymentCode = [
  normalizePaymentcode,
  paymentCodeValidationChecks,
  (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const viewData = {
        invalidPaymentCode: true,
      };
      res.render('payment/index', viewData);
    } else {
      res.redirect(`payment-code/${req.body.payment_code}`);
    }
  },
];

export const getPaymentDetails = [
  paymentCodeValidationChecks,
  (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.redirect('../payment-code?invalidPaymentCode');
    } else {
      const paymentCode = req.params.payment_code;

      paymentService.getPenaltyDetails(paymentCode).then((details) => {
        res.render('payment/paymentDetails', details);
      }).catch(() => {
        res.redirect('../payment-code?invalidPaymentCode');
      });
    }
  },
];
