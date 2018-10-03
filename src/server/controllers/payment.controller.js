/* eslint-disable no-use-before-define */
import { intersection } from 'lodash';

import PaymentService from './../services/payment.service';
import PenaltyService from './../services/penalty.service';
import CpmsService from './../services/cpms.service';
import config from './../config';
import logger from './../utils/logger';
import PenaltyGroupService from '../services/penaltyGroup.service';

const paymentService = new PaymentService(config.paymentServiceUrl());
const penaltyService = new PenaltyService(config.penaltyServiceUrl());
const penaltyGroupService = new PenaltyGroupService(config.penaltyServiceUrl());
const cpmsService = new CpmsService(config.cpmsServiceUrl());

const getPenaltyDetails = (req) => {
  if (req.params.payment_code) {
    return penaltyService.getByPaymentCode(req.params.payment_code);
  }
  return penaltyService.getById(req.params.penalty_id);
};

export const makePayment = async (req, res) => {
  const paymentCode = req.params.payment_code;
  const userRole = req.session.rsp_user['custom:Role'];
  const chequeAuthorizedRoles = ['BankingFinance', 'ContactCentre'];
  if (!req.body.paymentType) {
    logger.warn('Missing payment type');
    return res.redirect(`${config.urlRoot()}/payment-code/${paymentCode}`);
  }
  const details = { ...req.body };
  logger.info(details);

  try {
    const penaltyDetails = await getPenaltyDetails(req);

    switch (req.body.paymentType) {
      case 'cash':
        return cpmsService.createCashTransaction(
          paymentCode,
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
            .then(() => res.redirect(`${config.urlRoot()}/payment-code/${penaltyDetails.paymentCode}`))
            .catch((error) => {
              logger.error(error);
              return res.redirect(`${config.urlRoot()}/payment-code/${penaltyDetails.paymentCode}`);
            });
        }).catch((error) => {
          logger.error(error);
          res.redirect(`${config.urlRoot()}/payment-code/${penaltyDetails.paymentCode}`);
        });
      case 'cheque':
        if (typeof userRole === 'string') {
          if (!chequeAuthorizedRoles.includes(userRole)) {
            // User doesn't have an authorized role, forbid access
            return res.render('main/forbidden', req.session);
          }
        } else {
          const matchedRoles = intersection(chequeAuthorizedRoles, userRole);
          if (!matchedRoles.length) return res.render('main/forbidden', req.session);
        }
        return cpmsService.createChequeTransaction(
          paymentCode,
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
            .then(() => res.redirect(`${config.urlRoot()}/payment-code/${penaltyDetails.paymentCode}`))
            .catch((error) => {
              logger.error(error);
              return res.redirect(`${config.urlRoot()}/payment-code/${penaltyDetails.paymentCode}`);
            });
        }).catch((error) => {
          logger.error(error);
          res.redirect(`${config.urlRoot()}/payment-code/${penaltyDetails.paymentCode}`);
        });
      case 'postal':
        return cpmsService.createPostalOrderTransaction(
          paymentCode,
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
            .then(() => res.redirect(`${config.urlRoot()}/payment-code/${penaltyDetails.paymentCode}`))
            .catch((error) => {
              logger.error(error);
              return res.redirect(`${config.urlRoot()}/payment-code/${penaltyDetails.paymentCode}`);
            });
        }).catch((error) => {
          logger.error(error);
          res.redirect(`${config.urlRoot()}/payment-code/${penaltyDetails.paymentCode}`);
        });
      default: return res.redirect(`${config.urlRoot()}/payment-code/${penaltyDetails.paymentCode}`);
    }
  } catch (error) {
    logger.error(error);
    return res.redirect(`${config.urlRoot()}/?invalidPaymentCode`);
  }
};

export const makeGroupPayment = async (req, res) => {
  const paymentCode = req.params.payment_code;
  try {
    const penaltyType = req.params.type;
    const { paymentType } = req.body;
    const penaltyGroup = await penaltyGroupService.getByPaymentCode(paymentCode);
    const penaltiesOfType = penaltyGroup.penaltyDetails.find(p => p.type === penaltyType).penalties;
    const amountPaidForType = penaltyGroup.penaltyGroupDetails.splitAmounts
      .find(s => s.type === penaltyType).amount;
    const redirectUrl = `${config.postPaymentRedirectBaseUrl()}/payment-code/${paymentCode}/${penaltyType}/receipt`;

    const paymentMethodMappings = {
      cash: { transactionCreationFunction: cpmsService.createGroupCashTransaction, paymentRecordMethod: 'CASH' },
      cheque: { transactionCreationFunction: cpmsService.createGroupChequeTransaction, paymentRecordMethod: 'CHEQUE' },
      postal: { transactionCreationFunction: cpmsService.createGroupPostalOrderTransaction, paymentRecordMethod: 'POSTAL_ORDER' },
    };

    const paymentMethodStrategy = paymentMethodMappings[paymentType];

    const partialCreationFunction = paymentMethodStrategy.transactionCreationFunction.bind(
      cpmsService,
      paymentCode,
      penaltyGroup.penaltyGroupDetails,
      penaltyType,
      penaltyGroup.penaltyDetails,
      redirectUrl,
    );

    const finalTransactionCreationFunction = bindArgsForPaymentType(
      partialCreationFunction,
      paymentType,
      req.body,
    );

    const cpmsResp = await finalTransactionCreationFunction();

    if (cpmsResp.data.code !== '000') {
      return res.render('payment/failedPayment', req.session);
    }

    await paymentService.recordGroupPayment({
      PaymentCode: paymentCode,
      PenaltyType: penaltyType,
      PaymentDetail: {
        PaymentMethod: paymentMethodStrategy.paymentRecordMethod,
        PaymentRef: cpmsResp.data.receipt_reference,
        PaymentAmount: amountPaidForType,
        PaymentDate: Date.now() / 1000,
      },
      PenaltyIds: penaltiesOfType.map(p => `${p.reference}_${penaltyType}`),
    });

    return res.redirect(`${config.urlRoot()}/payment-code/${paymentCode}/${penaltyType}/receipt`);
  } catch (error) {
    logger.error(error);
    return res.redirect(`${config.urlRoot()}/payment-code/${paymentCode}`);
  }
};

const bindArgsForPaymentType = (partialFn, paymentType, body) => {
  switch (paymentType) { /* eslint-disable no-case-declarations */
    case 'cash':
      return partialFn.bind(cpmsService, body.slipNumber);
    case 'cheque':
      const {
        slipNumber,
        chequeNumber,
        chequeDate,
        nameOnCheque,
      } = body;
      return partialFn.bind(cpmsService, slipNumber, chequeNumber, chequeDate, nameOnCheque);
    case 'postal':
      return partialFn.bind(cpmsService, body.slipNumber, body.postalOrderNumber);
    default:
      return partialFn;
  }
};

export const renderPaymentPage = async (req, res) => {
  let penaltyDetails;

  try {
    penaltyDetails = await getPenaltyDetails(req);

    if (penaltyDetails.status === 'PAID') {
      return res.redirect(`${config.urlRoot()}/payment-code/${penaltyDetails.paymentCode}`);
    }
    // Payment Type is expected to come from the query string, otherwise the default is used
    const paymentType = req.query.paymentType ? req.query.paymentType : 'card';
    const { paymentCode } = penaltyDetails;
    const redirectUrl = `${config.postPaymentRedirectBaseUrl()}/payment-code/${paymentCode}/confirmPayment`;

    switch (paymentType) {
      case 'cash':
        return res.render('payment/cash', {
          ...penaltyDetails,
          ...req.session,
        });
      case 'cheque':
        return res.render('payment/cheque', {
          ...penaltyDetails,
          ...req.session,
        });
      case 'postal':
        return res.render('payment/postal', {
          ...penaltyDetails,
          ...req.session,
        });
      default:
        return cpmsService.createCardNotPresentTransaction(
          paymentCode,
          penaltyDetails.vehicleReg,
          penaltyDetails.reference,
          penaltyDetails.type,
          penaltyDetails.amount,
          redirectUrl,
        ).then(response => res.redirect(response.data.gateway_url))
          .catch((error) => {
            logger.error(error);
            res.redirect(`${config.urlRoot()}/payment-code/${penaltyDetails.paymentCode}`);
          });
    }
  } catch (error) {
    return res.redirect(`${config.urlRoot()}/?invalidPaymentCode`);
  }
};

export const renderGroupPaymentPage = async (req, res) => {
  const paymentCode = req.params.payment_code;
  try {
    const penaltyType = req.params.type;
    const { paymentType } = req.query;
    const penaltyGroup = await penaltyGroupService.getByPaymentCode(paymentCode);

    if (penaltyGroup.paymentStatus === 'PAID') {
      return res.redirect(`${config.urlRoot()}/payment-code/${paymentCode}`);
    }

    if (paymentType === 'card') {
      const penaltyDetails = penaltyGroup.penaltyDetails
        .find(typeGrp => typeGrp.type === penaltyType).penalties;
      const redirectUrl = `${config.postPaymentRedirectBaseUrl()}/payment-code/${paymentCode}/${penaltyType}/confirmGroupPayment`;
      const cpmsResp = await cpmsService.createCardNotPresentGroupTransaction(
        penaltyGroup.paymentCode,
        penaltyGroup.penaltyGroupDetails,
        penaltyType,
        penaltyDetails,
        redirectUrl,
      );
      return res.redirect(cpmsResp.data.gateway_url);
    }

    const penaltyGroupWithPaymentType = { ...penaltyGroup, paymentPenaltyType: penaltyType };
    switch (paymentType) {
      case 'cash':
        return res.render('payment/groupCash', {
          ...penaltyGroupWithPaymentType,
          ...req.session,
        });
      case 'cheque':
        return res.render('payment/groupCheque', {
          ...penaltyGroupWithPaymentType,
          ...req.session,
        });
      case 'postal':
        return res.render('payment/groupPostalOrder', {
          ...penaltyGroupWithPaymentType,
          ...req.session,
        });
      default:
        return res.redirect(`${config.urlRoot()}/?invalidPaymentCode`);
    }
  } catch (err) {
    logger.error(err);
    return res.redirect(`${config.urlRoot()}/payment-code/${paymentCode}`);
  }
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
        paymentService.makePayment(details).then(() => res.redirect(`${config.urlRoot()}/payment-code/${penaltyDetails.paymentCode}`))
          .catch(() => res.redirect(`${config.urlRoot()}/payment-code/${penaltyDetails.paymentCode}`));
      } else {
        logger.warn(response.data);
        res.render('payment/failedPayment', req.session);
      }
    }).catch(() => res.render('payment/failedPayment', req.session));
  } catch (error) {
    res.redirect(`${config.urlRoot()}/?invalidPaymentCode`);
  }
};

export const confirmGroupPayment = async (req, res) => {
  try {
    const paymentCode = req.params.payment_code;
    const penaltyType = req.params.type;
    const receiptReference = req.query.receipt_reference;
    const penaltyGroup = await penaltyGroupService.getByPaymentCode(paymentCode);
    const confirmResp = await cpmsService.confirmPayment(receiptReference, penaltyType);

    const cpmsCode = confirmResp.data.code;
    if (cpmsCode === 801) {
      const payload = buildGroupPaymentPayload(
        paymentCode,
        receiptReference,
        penaltyType,
        penaltyGroup,
        confirmResp,
      );
      await paymentService.recordGroupPayment(payload);
      return res.redirect(`${config.urlRoot()}/payment-code/${paymentCode}/${penaltyType}/receipt`);
    } else if (cpmsCode === 807) {
      return res.redirect(`${config.urlRoot()}/payment-code/${paymentCode}`);
    }
    return res.render('payment/confirmError', req.session);
  } catch (error) {
    logger.error(error);
    return res.render('payment/confirmError', req.session);
  }
};

export const reversePayment = async (req, res) => {
  // Get penalty details
  try {
    const penaltyDetails = await getPenaltyDetails(req);

    if (penaltyDetails.status === 'UNPAID') {
      return res.redirect(`${config.urlRoot()}/payment-code/${penaltyDetails.paymentCode}`);
    }

    const penaltyId = `${penaltyDetails.reference}_${penaltyDetails.type}`;

    // Check payment method
    switch (penaltyDetails.paymentMethod) {
      case 'CARD':
        cpmsService.reverseCardPayment(penaltyDetails.paymentRef, penaltyDetails.type, penaltyId)
          .then(() => {
            paymentService.reversePayment(penaltyId).then((response) => {
              logger.info(response);
              return res.redirect(`${config.urlRoot()}/payment-code/${penaltyDetails.paymentCode}`);
            }).catch((error) => {
              logger.error(error);
              return res.redirect(`${config.urlRoot()}/payment-code/${penaltyDetails.paymentCode}`);
            });
          }).catch((error) => {
            logger.error(error);
            return res.redirect(`${config.urlRoot()}/payment-code/${penaltyDetails.paymentCode}`);
          });
        break;
      case 'CHEQUE':
        cpmsService.reverseChequePayment(penaltyDetails.paymentRef, penaltyDetails.type, penaltyId)
          .then(() => {
            paymentService.reversePayment(penaltyId).then((response) => {
              logger.info(response);
              return res.redirect(`${config.urlRoot()}/payment-code/${penaltyDetails.paymentCode}`);
            }).catch((error) => {
              logger.error(error);
              return res.redirect(`${config.urlRoot()}/payment-code/${penaltyDetails.paymentCode}`);
            });
          }).catch((error) => {
            logger.error(error);
            return res.redirect(`${config.urlRoot()}/payment-code/${penaltyDetails.paymentCode}`);
          });
        break;
      // Postal orders and cash reversals are not handled by CPMS
      case 'POSTAL':
      case 'CASH':
        paymentService.reversePayment(penaltyId).then((response) => {
          logger.info(response);
          return res.redirect(`${config.urlRoot()}/payment-code/${penaltyDetails.paymentCode}`);
        }).catch((error) => {
          logger.error(error);
          return res.redirect(`${config.urlRoot()}/payment-code/${penaltyDetails.paymentCode}`);
        });
        break;
      default:
        // If we don't know the payment method we can't reverse it
        return res.redirect(`${config.urlRoot()}/payment-code/${penaltyDetails.paymentCode}`);
    }
  } catch (error) {
    logger.warn(error);
    return res.redirect(`${config.urlRoot()}/?invalidPaymentCode`);
  }
  return true;
};

function buildGroupPaymentPayload(paymentCode, receiptReference, type, penaltyGroup, confirmResp) {
  const amountForType = penaltyGroup.penaltyGroupDetails.splitAmounts
    .find(a => a.type === type).amount;
  return {
    PaymentCode: paymentCode,
    PenaltyType: type,
    PaymentDetail: {
      PaymentMethod: 'CNP',
      PaymentRef: receiptReference,
      AuthCode: confirmResp.data.auth_code,
      PaymentAmount: amountForType,
      PaymentDate: Math.floor(Date.now() / 1000),
    },
    PenaltyIds: penaltyGroup.penaltyDetails
      .find(penaltiesOfType => penaltiesOfType.type === type).penalties
      .map(penalties => `${penalties.reference}_${type}`),
  };
}
