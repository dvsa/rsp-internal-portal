import { intersection } from 'lodash';
import config from '../config';
import formatUserRole from '../utils/formatUserRole';
import { logError, logInfo } from '../utils/logger';
import { userToken, verifyToken } from './verifyToken';
import { AuthorizationError, AuthorizationErrorCode } from '../utils/authorisationError';
import AuthService from '../services/auth.service';

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

const refresh = async (refreshToken) => {
  try {
    const authService = new AuthService(config.cognitoUrl());
    const token = await authService.refreshAccessToken(refreshToken);
    return token;
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
    await verifyToken(req.cookies.rsp_access.accessToken);

    req.session.rsp_user = userToken(req.cookies.rsp_access.idToken);

    const userRole = formatUserRole(req.session.rsp_user['custom:Role']);

    if (config.doRoleChecks()) {
      roleCheck(userRole);
    } else {
      logInfo('doRoleCheck', 'Role checking disabled in config.');
    }

    req.session.rsp_user_role = userRole;

    logInfo('User', { userRole: req.session.rsp_user_role, userEmail: req.session.rsp_user.email });

    return next();
  } catch (err) {
    if (err.code === AuthorizationErrorCode.EXPIRED_TOKEN) {
      logError('Authorization.middleware', err.message);
      const token = await refresh(req.cookies.rsp_refresh.refreshToken);
      if (token) {
        res.cookie('rsp_access', { accessToken: token.access_token, idToken: token.id_token }, { maxAge: token.expires_in * 1000, httpOnly: true, secure: !config.isDevelopment() });
        return authorization(req, res, next);
      }
      err.code = AuthorizationErrorCode.REFRESH_TOKEN_ERROR;
    }
    if (redirectErrors.includes(err.code)) {
      res.clearCookie('rsp_access');
      res.clearCookie('rsp_refresh');
      logError('Authorization.middleware', err.message);
      return res.redirect(`${config.urlRoot()}/login`);
    }
    logError(`Error: ${err.message}`);
    return res.render('main/forbidden', req.session);
  }
};

export default authorization;
