/* eslint-disable no-use-before-define */
import { intersection } from 'lodash';

import PaymentService from './../services/payment.service';
import PenaltyService from './../services/penalty.service';
import CpmsService from './../services/cpms.service';
import config from './../config';
import { logError, logInfo } from './../utils/logger';
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

function validPaymentTypeForPenaltyType(paymentType, penaltyType) {
  if (penaltyType === 'IM') {
    return !(paymentType === 'cheque' || paymentType === 'postal');
  }
  return true;
}

export const makePayment = async (req, res) => {
  const paymentCode = req.params.payment_code;
  const userRole = req.session.rsp_user_role;
  const chequeAuthorizedRoles = ['BankingFinance', 'ContactCentre'];
  if (!req.body.paymentType) {
    logError('MissingPaymentType', 'Missing payment type in makePayment request body');
    return res.redirect(`${config.urlRoot()}/payment-code/${paymentCode}`);
  }
  const details = { ...req.body };

  try {
    const penaltyDetails = await getPenaltyDetails(req);

    if (!validPaymentTypeForPenaltyType(req.body.paymentType, penaltyDetails.type)) {
      // Cheque payment not allowed for IM
      return res.redirect(`${config.urlRoot()}/payment-code/${penaltyDetails.paymentCode}`);
    }

    logInfo('MakePayment', {
      userEmail: req.session.rsp_user.email,
      paymentCode,
      userRole,
      paymentType: req.body.paymentType,
    });

    switch (req.body.paymentType) {
      case 'cash':
        return cpmsService.createCashTransaction(
          paymentCode,
          penaltyDetails.vehicleReg,
          penaltyDetails.formattedReference,
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
            .catch(() => (res.redirect(`${config.urlRoot()}/payment-code/${penaltyDetails.paymentCode}`)));
        }).catch(() => {
          res.redirect(`${config.urlRoot()}/payment-code/${penaltyDetails.paymentCode}`);
        });
      case 'cheque':
        if (config.doRoleChecks()) {
          if (typeof userRole === 'string') {
            if (!chequeAuthorizedRoles.includes(userRole)) {
              // User doesn't have an authorized role, forbid access
              return res.render('main/forbidden', req.session);
            }
          } else {
            const matchedRoles = intersection(chequeAuthorizedRoles, userRole);
            if (!matchedRoles.length) {
              return res.render('main/forbidden', req.session);
            }
          }
        }
        return cpmsService.createChequeTransaction(
          paymentCode,
          penaltyDetails.vehicleReg,
          penaltyDetails.formattedReference,
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
            .catch(() => (res.redirect(`${config.urlRoot()}/payment-code/${penaltyDetails.paymentCode}`)));
        }).catch(() => (res.redirect(`${config.urlRoot()}/payment-code/${penaltyDetails.paymentCode}`)));
      case 'postal':
        return cpmsService.createPostalOrderTransaction(
          paymentCode,
          penaltyDetails.vehicleReg,
          penaltyDetails.formattedReference,
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
            .catch(() => (res.redirect(`${config.urlRoot()}/payment-code/${penaltyDetails.paymentCode}`)));
        }).catch((error) => {
          logError('CPMSCreatePostalOrderError', error.message);
          res.redirect(`${config.urlRoot()}/payment-code/${penaltyDetails.paymentCode}`);
        });
      default: return res.redirect(`${config.urlRoot()}/payment-code/${penaltyDetails.paymentCode}`);
    }
  } catch (error) {
    logError('MakePaymentError', {
      error: error.message,
    });
    return res.redirect(`${config.urlRoot()}/?invalidPaymentCode`);
  }
};

export const makeGroupPayment = async (req, res) => {
  const paymentCode = req.params.payment_code;
  try {
    const penaltyType = req.params.type;
    const { paymentType } = req.body;

    if (!validPaymentTypeForPenaltyType(paymentType, penaltyType)) {
      return res.redirect(`${config.urlRoot()}/payment-code/${paymentCode}`);
    }

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

    if (!validPaymentTypeForPenaltyType(paymentType, penaltyDetails.type)) {
      return res.redirect(`${config.urlRoot()}/payment-code/${paymentCode}`);
    }

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
          penaltyDetails.formattedReference,
          penaltyDetails.type,
          penaltyDetails.amount,
          redirectUrl,
        ).then(response => res.redirect(response.data.gateway_url))
          .catch(() => {
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

    if (!validPaymentTypeForPenaltyType(paymentType, penaltyType)) {
      return res.redirect(`${config.urlRoot()}/payment-code/${paymentCode}/${penaltyType}/details`);
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
        logInfo('PaymentNotConfirmedOnRedirect', response.data);
        res.render('payment/failedPayment', req.session);
      }
    }).catch(() => (res.render('payment/failedPayment', req.session)));
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
    return res.render('payment/confirmError', req.session);
  }
};

const paymentMethods = ['CARD', 'CNP', 'CHEQUE', 'POSTAL', 'CASH'];

export const reversePayment = async (req, res) => {
  // Get penalty details
  let penaltyDetails;
  try {
    penaltyDetails = await getPenaltyDetails(req);
  } catch (error) {
    return res.redirect(`${config.urlRoot()}/?invalidPaymentCode`);
  }

  const {
    reference,
    type,
    paymentRef,
    paymentCode,
    paymentMethod,
  } = penaltyDetails;

  if (penaltyDetails.status === 'UNPAID' || !paymentMethods.includes(paymentMethod)) {
    return res.redirect(`${config.urlRoot()}/payment-code/${paymentCode}`);
  }

  const logMessage = {
    userEmail: req.session.rsp_user.email,
    userRole: req.session.rsp_user_role,
    penaltyDetails,
  };

  logInfo('ReversePayment', logMessage);

  const penaltyId = `${reference}_${type}`;

  try {
    if (paymentMethod === 'CARD' || paymentMethod === 'CNP') {
      await cpmsService.reverseCardPayment(paymentRef, type, paymentCode);
    } else if (paymentMethod === 'CHEQUE') {
      await cpmsService.reverseChequePayment(paymentRef, type, paymentCode);
    }
    logInfo('ReversePaymentCPMSSuccess', logMessage);
  } catch (cpmsError) {
    logError('ReversePaymentCPMSError', {
      ...logMessage,
      error: cpmsError.message,
    });
    return res.redirect(`${config.urlRoot()}/payment-code/${paymentCode}`);
  }

  try {
    await paymentService.reversePayment(penaltyId);
    return res.redirect(`${config.urlRoot()}/payment-code/${paymentCode}`);
  } catch (error) {
    return res.redirect(`${config.urlRoot()}/payment-code/${paymentCode}`);
  }
};

export const reverseGroupPayment = async (req, res) => {
  const paymentCode = req.params.payment_code;
  const penaltyType = req.params.type;
  let paymentDetails;
  try {
    paymentDetails = (await paymentService.getGroupPayment(paymentCode)).data.Payments;
  } catch (error) {
    return res.redirect(`${config.urlRoot()}/?invalidPaymentCode`);
  }
  const { PaymentMethod, PaymentRef } = paymentDetails[penaltyType];

  if (!paymentMethods.includes(PaymentMethod)) {
    // If we don't know the payment method we can't reverse it
    return res.redirect(`${config.urlRoot()}/payment-code/${paymentCode}`);
  }

  const logMesssage = {
    userEmail: req.session.rsp_user.email,
    userRole: req.session.rsp_user_role,
    paymentCode,
    penaltyType,
    paymentMethod: PaymentMethod,
  };

  logInfo('ReverseGroupPayment', logMesssage);

  try {
    if (PaymentMethod === 'CARD' || PaymentMethod === 'CNP') {
      await cpmsService.reverseCardPayment(PaymentRef, penaltyType, paymentCode);
    } else if (PaymentMethod === 'CHEQUE') {
      await cpmsService.reverseChequePayment(PaymentRef, penaltyType, paymentCode);
    }
    logInfo('ReverseGroupPaymentCPMSSuccess', logMesssage);
  } catch (cpmsError) {
    logError('ReverseGroupPaymentCPMSError', {
      ...logMesssage,
      error: cpmsError.message,
    });
    return res.redirect(`${config.urlRoot()}/payment-code/${paymentCode}`);
  }

  try {
    await paymentService.reverseGroupPayment(paymentCode, penaltyType);
    logInfo('ReverseGroupPaymentSuccess', logMesssage);
    return res.redirect(`${config.urlRoot()}/payment-code/${paymentCode}`);
  } catch (error) {
    logError('ReverseGroupPaymentPaymentServiceError', {
      ...logMesssage,
      error: error.message,
    });
    return res.redirect(`${config.urlRoot()}/payment-code/${paymentCode}`);
  }
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
