import { format } from 'url';
import PaymentService from './../services/payment.service';
import PenaltyService from './../services/penalty.service';
import config from './../config';

const paymentService = new PaymentService(config.paymentServiceUrl);
const penaltyService = new PenaltyService(config.penaltyServiceUrl);

const getPenaltyDetails = (req) => {
  if (req.params.payment_code) {
    return penaltyService.getByPaymentCode(req.params.payment_code);
  }
  return penaltyService.getByReference(req.params.penalty_ref);
};

export const renderPaymentPage = async (req, res) => {
  let penaltyDetails;

  try {
    penaltyDetails = await getPenaltyDetails(req);

    // Payment Type is expected to come from the query string, otherwise the default is used
    const paymentType = req.query.paymentType ? req.query.paymentType : 'card';

    switch (paymentType) {
      case 'cash':
        res.render('payment/cash', penaltyDetails);
        break;
      case 'cheque':
      case 'postal':
        res.render('payment/cheque', { ...penaltyDetails, paymentType });
        break;
      default:
        res.redirect(format({
          pathname: `${config.urlRoot}/cpms-step-1`,
          query: penaltyDetails,
        }));
    }
  } catch (error) {
    res.redirect('/?invalidPaymentCode');
  }
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
    res.redirect(`${config.urlRoot}/payment-code/${req.body.paymentCode}`);
  }).catch(() => res.redirect('back')); // TODO: Add appropriate error page and/or logging
};

