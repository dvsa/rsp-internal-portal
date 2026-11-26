import { intersection } from 'lodash';
import config from '../config';
import formatUserRole from '../utils/formatUserRole';
import { logError, logInfo } from '../utils/logger';
import { AuthorizationError, AuthorizationErrorCode } from '../utils/authorisationError';
import { authService } from '../services/auth.service';

const authorizedRoles = ['ContactCentre', 'BankingFinance', 'FrontLine'];
const redirectErrors = [AuthorizationErrorCode.EXPIRED_TOKEN, AuthorizationErrorCode.VERIFY_TOKEN_ERROR, AuthorizationErrorCode.REFRESH_TOKEN_ERROR];

const roleCheck = (userRole) => {
  if (!userRole) {
    throw new AuthorizationError('User role not found', AuthorizationErrorCode.MISSING_ROLE);
  }
  if (typeof userRole === 'string') {
    if (!authorizedRoles.includes(userRole)) {
      throw new AuthorizationError(`Role ${userRole} not authorized`, AuthorizationErrorCode.INVALID_ROLE);
    }
  } else {
    // Otherwise, treat as an array of strings
    const matchedRoles = intersection(authorizedRoles, userRole);
    if (matchedRoles.length === 0) {
      throw new AuthorizationError(`Role ${userRole} not authorized`, AuthorizationErrorCode.INVALID_ROLE);
    }
  }
};

const refresh = async (accountId) => {
  try {
    return await authService.refreshAccessToken(accountId);
  } catch (err) {
    logError('Authorization.middleware', { message: 'Failed to refresh token', error: err.message });
    return null;
  }
};

const authorization = async (req, res, next) => {
  if (!req.cookies.rsp_access) {
    return res.redirect(`${config.urlRoot()}/login`);
  }

  try {
    let claims;
    let refreshedToken;
    try {
      claims = await authService.verifyToken(req.cookies.rsp_access.idToken);
    } catch (err) {
      if (err.code !== AuthorizationErrorCode.EXPIRED_TOKEN) throw err;
      refreshedToken = await refresh(req.session.rsp_account_id);
      if (!refreshedToken) {
        throw new AuthorizationError('Failed to refresh token', AuthorizationErrorCode.REFRESH_TOKEN_ERROR);
      }
      claims = await authService.verifyToken(refreshedToken.idToken);
    }

    if (!req.session.rsp_subject || claims.sub !== req.session.rsp_subject) {
      throw new AuthorizationError('Token does not match the session', AuthorizationErrorCode.VERIFY_TOKEN_ERROR);
    }

    const userRole = formatUserRole(claims.roles);

    if (config.doRoleChecks()) {
      roleCheck(userRole);
    } else {
      logInfo('doRoleCheck', 'Role checking disabled in config.');
    }

    if (refreshedToken) {
      res.cookie('rsp_access', { idToken: refreshedToken.idToken }, { httpOnly: true, secure: !config.isDevelopment(), sameSite: 'lax' });
    }
    req.session.rsp_user = claims;
    req.session.rsp_user_role = userRole;

    logInfo('User', { userRole: req.session.rsp_user_role, userEmail: req.session.rsp_user.email });

    return next();
  } catch (err) {
    if (redirectErrors.includes(err.code)) {
      res.clearCookie('rsp_access');
      logError('Authorization.middleware', err.message);
      return res.redirect(`${config.urlRoot()}/login`);
    }
    logError(`Error: ${err.message}`);
    return res.render('main/forbidden', req.session);
  }
};

export default authorization;
