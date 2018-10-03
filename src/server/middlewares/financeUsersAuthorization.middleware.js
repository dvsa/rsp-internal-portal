import { intersection } from 'lodash';

const authorizedRoles = ['BankingFinance'];

export default (req, res, next) => {
  const userRole = req.session.rsp_user_role;
  if (userRole) {
    if (typeof userRole === 'string') {
      if (authorizedRoles.includes(userRole)) return next();
    } else {
      const matchedRoles = intersection(authorizedRoles, userRole);
      if (matchedRoles.length) return next();
    }
    // User doesn't have an authorized role, forbid access
    return res.render('main/forbidden', req.session);
  }
  // User doesn't have an authorized role, forbid access
  return res.render('main/forbidden', req.session);
};
