const authorizedRoles = ['BankingFinance'];

export default (req, res, next) => {
  const userRole = req.session.rsp_user['custom:Role'];
  if (userRole) {
    if (authorizedRoles.some(item => item === userRole.toLowerCase())) {
      return next();
    }
    // User doesn't have an authorized role, forbid access
    return res.render('main/forbidden', req.session);
  }
  // User doesn't have an authorized role, forbid access
  return res.render('main/forbidden', req.session);
};
