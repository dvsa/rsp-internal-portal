import PaymentService from './../services/payment.service';
import PenaltyService from './../services/penalty.service';
import CpmsService from './../services/cpms.service';
import config from './../config';
import logger from './../utils/logger';

const paymentService = new PaymentService(config.paymentServiceUrl);
const penaltyService = new PenaltyService(config.penaltyServiceUrl);
const cpmsService = new CpmsService(config.cpmsServiceUrl);

const getPenaltyDetails = (req) => {
  if (req.params.payment_code) {
    return penaltyService.getByPaymentCode(req.params.payment_code);
  }
  return penaltyService.getById(req.params.penalty_id);
};

export const makePayment = async (req, res) => {
  if (!req.body.paymentType) {
    logger.warn('Missing payment type');
    return res.redirect(`${config.urlRoot}/payment-code/${req.params.payment_code}`);
  }
  const details = { ...req.body };
  logger.info(details);

  try {
    const penaltyDetails = await getPenaltyDetails(req);

    switch (req.body.paymentType) {
      case 'cash':
        return cpmsService.createCashTransaction(
          penaltyDetails.vehicleReg,
          penaltyDetails.reference,
          penaltyDetails.type,
          penaltyDetails.amount,
          details.slipNumber,
        ).then((response) => {
          const paymentDetails = {
            PenaltyStatus: 'PAID',
            PenaltyType: penaltyDetails.type,
            PenaltyReference: penaltyDetails.reference,
            PaymentDetail: {
              PaymentMethod: req.body.paymentType.toUpperCase(),
              PaymentRef: response.data.receipt_reference,
              PaymentAmount: penaltyDetails.amount,
              PaymentDate: Math.round((new Date()).getTime() / 1000),
            },
          };
          paymentService.makePayment(paymentDetails)
            .then(() => res.redirect(`${config.urlRoot}/payment-code/${penaltyDetails.paymentCode}`))
            .catch((error) => {
              logger.error(error);
              return res.redirect(`${config.urlRoot}/payment-code/${penaltyDetails.paymentCode}`);
            });
        }).catch((error) => {
          logger.error(error);
          res.redirect(`${config.urlRoot}/payment-code/${penaltyDetails.paymentCode}`);
        });
      case 'cheque':
        return cpmsService.createChequeTransaction(
          penaltyDetails.vehicleReg,
          penaltyDetails.reference,
          penaltyDetails.type,
          penaltyDetails.amount,
          details.slipNumber,
          details.chequeDate,
          details.chequeNumber,
          details.nameOnCheque,
        ).then((response) => {
          const paymentDetails = {
            PenaltyStatus: 'PAID',
            PenaltyType: penaltyDetails.type,
            PenaltyReference: penaltyDetails.reference,
            PaymentDetail: {
              PaymentMethod: req.body.paymentType.toUpperCase(),
              PaymentRef: response.data.receipt_reference,
              PaymentAmount: penaltyDetails.amount,
              PaymentDate: Math.round((new Date()).getTime() / 1000),
            },
          };
          paymentService.makePayment(paymentDetails)
            .then(() => res.redirect(`${config.urlRoot}/payment-code/${penaltyDetails.paymentCode}`))
            .catch((error) => {
              logger.error(error);
              return res.redirect(`${config.urlRoot}/payment-code/${penaltyDetails.paymentCode}`);
            });
        }).catch((error) => {
          logger.error(error);
          res.redirect(`${config.urlRoot}/payment-code/${penaltyDetails.paymentCode}`);
        });
      case 'postal':
        return cpmsService.createPostalOrderTransaction(
          penaltyDetails.vehicleReg,
          penaltyDetails.reference,
          penaltyDetails.type,
          penaltyDetails.amount,
          details.slipNumber,
          details.postalOrderNumber,
        ).then((response) => {
          const paymentDetails = {
            PenaltyStatus: 'PAID',
            PenaltyType: penaltyDetails.type,
            PenaltyReference: penaltyDetails.reference,
            PaymentDetail: {
              PaymentMethod: req.body.paymentType.toUpperCase(),
              PaymentRef: response.data.receipt_reference,
              PaymentAmount: penaltyDetails.amount,
              PaymentDate: Math.round((new Date()).getTime() / 1000),
            },
          };
          paymentService.makePayment(paymentDetails)
            .then(() => res.redirect(`${config.urlRoot}/payment-code/${penaltyDetails.paymentCode}`))
            .catch((error) => {
              logger.error(error);
              return res.redirect(`${config.urlRoot}/payment-code/${penaltyDetails.paymentCode}`);
            });
        }).catch((error) => {
          logger.error(error);
          res.redirect(`${config.urlRoot}/payment-code/${penaltyDetails.paymentCode}`);
        });
      default: return res.redirect(`${config.urlRoot}/payment-code/${penaltyDetails.paymentCode}`);
    }
  } catch (error) {
    logger.error(error);
    return res.redirect(`${config.urlRoot}/?invalidPaymentCode`);
  }
};

export const renderPaymentPage = async (req, res) => {
  let penaltyDetails;

  try {
    penaltyDetails = await getPenaltyDetails(req);

    if (penaltyDetails.status === 'PAID') {
      return res.redirect(`${config.urlRoot}/payment-code/${penaltyDetails.paymentCode}`);
    }
    // Payment Type is expected to come from the query string, otherwise the default is used
    const paymentType = req.query.paymentType ? req.query.paymentType : 'card';
    const redirectUrl = `https://${req.get('host')}${config.urlRoot}/payment-code/${penaltyDetails.paymentCode}/confirmPayment`;

    switch (paymentType) {
      case 'cash':
        return res.render('payment/cash', penaltyDetails);
      case 'cheque':
        return res.render('payment/cheque', penaltyDetails);
      case 'postal':
        return res.render('payment/postal', penaltyDetails);
      default:
        return cpmsService.createCardNotPresentTransaction(
          penaltyDetails.vehicleReg,
          penaltyDetails.reference,
          penaltyDetails.type,
          penaltyDetails.amount,
          redirectUrl,
        ).then(response => res.redirect(response.data.gateway_url))
          .catch((error) => {
            logger.error(error);
            res.redirect(`${config.urlRoot}/payment-code/${penaltyDetails.paymentCode}`);
          });
    }
  } catch (error) {
    return res.redirect(`${config.urlRoot}/?invalidPaymentCode`);
  }
};

export const renderGroupPaymentPage = async (req, res) => {
  const paymentCode = req.params.payment_code;
  res.redirect(`${config.urlRoot}/payment-code/${paymentCode}`);
};

export const confirmPayment = async (req, res) => {
  const receiptReference = req.query.receipt_reference;
  let penaltyDetails;

  try {
    penaltyDetails = await getPenaltyDetails(req);
    cpmsService.confirmPayment(receiptReference, penaltyDetails.type).then((response) => {
      if (response.data.code === 801) {
        // Payment successful
        const details = {
          PenaltyStatus: 'PAID',
          PenaltyType: penaltyDetails.type,
          PenaltyReference: penaltyDetails.reference,
          PaymentDetail: {
            PaymentMethod: 'CARD',
            PaymentRef: response.data.receipt_reference,
            AuthCode: response.data.auth_code,
            PaymentAmount: penaltyDetails.amount,
            PaymentDate: Math.round((new Date()).getTime() / 1000),
          },
        };
        paymentService.makePayment(details).then(() => res.redirect(`${config.urlRoot}/payment-code/${penaltyDetails.paymentCode}`))
          .catch(() => res.redirect(`${config.urlRoot}/payment-code/${penaltyDetails.paymentCode}`));
      } else {
        logger.warn(response.data);
        res.render('payment/failedPayment');
      }
    }).catch(() => res.render('payment/failedPayment'));
  } catch (error) {
    res.redirect(`${config.urlRoot}/?invalidPaymentCode`);
  }
};

export const reversePayment = async (req, res) => {
  // Get penalty details
  try {
    const penaltyDetails = await getPenaltyDetails(req);

    if (penaltyDetails.status === 'UNPAID') {
      return res.redirect(`${config.urlRoot}/payment-code/${penaltyDetails.paymentCode}`);
    }

    const penaltyId = `${penaltyDetails.reference}_${penaltyDetails.type}`;

    // Check payment method
    switch (penaltyDetails.paymentMethod) {
      case 'CARD':
        cpmsService.reverseCardPayment(penaltyDetails.paymentRef, penaltyDetails.type, penaltyId)
          .then(() => {
            paymentService.reversePayment(penaltyId).then((response) => {
              logger.info(response);
              return res.redirect(`${config.urlRoot}/payment-code/${penaltyDetails.paymentCode}`);
            }).catch((error) => {
              logger.error(error);
              return res.redirect(`${config.urlRoot}/payment-code/${penaltyDetails.paymentCode}`);
            });
          }).catch((error) => {
            logger.error(error);
            return res.redirect(`${config.urlRoot}/payment-code/${penaltyDetails.paymentCode}`);
          });
        break;
      case 'CHEQUE':
        cpmsService.reverseChequePayment(penaltyDetails.paymentRef, penaltyDetails.type, penaltyId)
          .then(() => {
            paymentService.reversePayment(penaltyId).then((response) => {
              logger.info(response);
              return res.redirect(`${config.urlRoot}/payment-code/${penaltyDetails.paymentCode}`);
            }).catch((error) => {
              logger.error(error);
              return res.redirect(`${config.urlRoot}/payment-code/${penaltyDetails.paymentCode}`);
            });
          }).catch((error) => {
            logger.error(error);
            return res.redirect(`${config.urlRoot}/payment-code/${penaltyDetails.paymentCode}`);
          });
        break;
      // Postal orders and cash reversals are not handled by CPMS
      case 'POSTAL':
      case 'CASH':
        paymentService.reversePayment(penaltyId).then((response) => {
          logger.info(response);
          return res.redirect(`${config.urlRoot}/payment-code/${penaltyDetails.paymentCode}`);
        }).catch((error) => {
          logger.error(error);
          return res.redirect(`${config.urlRoot}/payment-code/${penaltyDetails.paymentCode}`);
        });
        break;
      default:
        // If we don't know the payment method we can't reverse it
        return res.redirect(`${config.urlRoot}/payment-code/${penaltyDetails.paymentCode}`);
    }
  } catch (error) {
    logger.warn(error);
    return res.redirect(`${config.urlRoot}/?invalidPaymentCode`);
  }
  return true;
};
