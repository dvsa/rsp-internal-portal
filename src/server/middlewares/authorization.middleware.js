import CognitoExpress from 'cognito-express';
import jwtDecode from 'jwt-decode';
import { intersection } from 'lodash';
import config from '../config';
import AuthService from '../services/auth.service';
import formatUserRole from '../utils/formatUserRole';
import { logError, logInfo } from '../utils/logger';

const authService = new AuthService(config.cognitoUrl());
const authorizedRoles = ['ContactCentre', 'BankingFinance', 'FrontLine'];
const cognitoExpress = new CognitoExpress({
  region: config.region(),
  cognitoUserPoolId: config.cognitoUserPoolId(),
  tokenUse: 'access',
  tokenExpiration: 3600000,
});

export default async (req, res, next) => {
  if (!req.cookies.rsp_access) {
    // If there's a refresh token on the cookies try to use that to get a new access token
    if (req.cookies.rsp_refresh) {
      authService.refreshAccessToken(req.cookies.rsp_refresh.refreshToken).then((token) => {
        res.cookie('rsp_access', { accessToken: token.access_token, idToken: token.id_token }, { maxAge: token.expires_in * 1000, httpOnly: true, secure: !config.isDevelopment() });
        return res.redirect(`${config.urlRoot()}/`);
      }).catch(() => {
        // Failed to retrieve new access token with refresh token
        // Clear up the cookies and enforce new login
        logInfo('RefreshFailed', 'Failed to retrieve new access token with refresh token. Removing cookies and redirecting to login');
        res.clearCookie('rsp_access');
        res.clearCookie('rsp_refresh');
      });
    }
    logInfo('TokenNotFound', 'Failed to retrieve access token. Redirecting to login page');
    return res.redirect(`${config.urlRoot()}/login`);
  }
  try {
    await cognitoExpress.validate(req.cookies.rsp_access.accessToken);
    logInfo('CognitoExpress.Validate', 'Validated cognito session cookies. Attempting to set user session.');
    // Get user information from the ID token
    const userInfo = jwtDecode(req.cookies.rsp_access.idToken);
    // Extract and clean up roles
    const userRole = formatUserRole(userInfo['custom:Role']);
    // Ensure that user information is available through the application (including views)
    req.session.rsp_user = userInfo;
    if (config.doRoleChecks()) {
      req.session.rsp_user_role = userRole;
      if (userRole) {
        // Allow for userRole to be a single string
        if (typeof userRole === 'string') {
          if (authorizedRoles.includes(userRole)) return next();
          // Otherwise, treat as an array of strings
        } else {
          const matchedRoles = intersection(authorizedRoles, userRole);
          if (matchedRoles.length) return next();
        }
        // User doesn't have an authorized role, forbid access
        logInfo('CognitoExpress.Validate', 'Forbidden. User does not have a valid role.');
        return res.render('main/forbidden', req.session);
      }
      logInfo('MissingUserRole');
      return res.render('main/forbidden', req.session);
    }
    logInfo('CognitoExpress.doRoleChecks', 'Role checking disabled in config.');
    return next();
  } catch (err) {
    logError('CognitoExpress.Validate.Error', `Error validating cognito session cookies. ${err}`);
    if (req.cookies.rsp_refresh) {
      authService.refreshAccessToken(req.cookies.rsp_refresh.refreshToken).then((token) => {
        res.cookie('rsp_access', { accessToken: token.access_token, idToken: token.id_token }, { maxAge: token.expires_in * 1000, httpOnly: true, secure: !config.isDevelopment() });
        return res.redirect(`${config.urlRoot()}/`);
      }).catch(() => {
        logError('CognitoExpress.Validate.Error', 'Invalid refresh token. Enforce new login.');
        res.clearCookie('rsp_access');
        return res.redirect(`${config.urlRoot()}/logout`);
      });
    }
  }
  return res.render('main/forbidden', req.session);
};
