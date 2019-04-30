import { intersection } from 'lodash';
import config from '../config';

const reversePaymentAuthorizedRoles = ['BankingFinance'];
const reportsAuthorizedRoles = ['BankingFinance', 'ContactCentre'];

const reversePaymentAuthorizer = (req, res, next) => {
  if (config.doRoleChecks()) {
    const userRole = req.session.rsp_user_role;
    if (userRole) {
      if (typeof userRole === 'string') {
        if (reversePaymentAuthorizedRoles.includes(userRole)) return next();
      } else {
        const matchedRoles = intersection(reversePaymentAuthorizedRoles, userRole);
        if (matchedRoles.length) return next();
      }
      // User doesn't have an authorized role, forbid access
      return res.render('main/forbidden', req.session);
    }
    // User doesn't have an authorized role, forbid access
    return res.render('main/forbidden', req.session);
  }
  return next();
};

const reportsAuthorizer = (req, res, next) => {
  if (config.doRoleChecks()) {
    const userRole = req.session.rsp_user_role;
    if (userRole) {
      if (typeof userRole === 'string') {
        if (reportsAuthorizedRoles.includes(userRole)) return next();
      } else {
        const matchedRoles = intersection(reportsAuthorizedRoles, userRole);
        if (matchedRoles.length) return next();
      }
      // User doesn't have an authorized role, forbid access
      return res.render('main/forbidden', req.session);
    }
    // User doesn't have an authorized role, forbid access
    return res.render('main/forbidden', req.session);
  }
  return next();
};

export {
  reversePaymentAuthorizer,
  reportsAuthorizer,
};
