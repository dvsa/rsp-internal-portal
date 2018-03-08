/* eslint-disable */
import url from 'url';
import PaymentService from './../services/payment.service';
import config from './../config';

const paymentService = new PaymentService(config.paymentServiceUrl);

// Step 1 route
export const step1 = (req, res) => {
  const { query } = url.parse(req.url, true);
  res.render('cpms/cpms-step-1', query);
};

export const step2 = (req, res) => {
  const { query } = url.parse(req.url, true);
  res.render('cpms/cpms-step-2', query);
};

export const step3 = (req, res) => {
  const { query } = url.parse(req.url, true);
  res.render('cpms/cpms-step-3', query);
};

export const makePayment = (req, res) => {
  const details = {
    PenaltyStatus: 'PAID',
    PenaltyType: req.body.type,
    PenaltyReference: req.body.reference,
    PaymentDetail: {
      PaymentRef: '12345678',
      AuthCode: '1234TBD',
      PaymentAmount: req.body.amount,
      PaymentDate: Math.round((new Date()).getTime() / 1000),
    },
  };
  paymentService.makePayment(details).then(() => {
    res.redirect(`payment-code/${req.body.paymentCode}`);
  }).catch(error => console.log(error));
};

