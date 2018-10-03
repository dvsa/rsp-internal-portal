import CognitoExpress from 'cognito-express';
import jwtDecode from 'jwt-decode';
import { intersection } from 'lodash';
import config from '../config';
import AuthService from '../services/auth.service';

const authService = new AuthService(config.cognitoUrl());
const authorizedRoles = ['ContactCentre', 'BankingFinance', 'FrontLine'];
const cognitoExpress = new CognitoExpress({
  region: config.region(),
  cognitoUserPoolId: config.cognitoUserPoolId(),
  tokenUse: 'access',
  tokenExpiration: 3600000,
});

export default (req, res, next) => {
  console.log('authorization middleware running');
  if (!req.cookies.rsp_access) {
    console.log('no rsp_access cookie');
    // If there's a refresh token on the cookies try to use that to get a new access token
    if (req.cookies.rsp_refresh) {
      authService.refreshAccessToken(req.cookies.rsp_refresh.refreshToken).then((token) => {
        res.cookie('rsp_access', { accessToken: token.access_token, idToken: token.id_token }, { maxAge: token.expires_in * 1000, httpOnly: true });
        res.redirect(`${config.urlRoot()}/`);
      }).catch(() => {
        // Failed to retrieve new access token with refresh token
        // Clear up the cookies and enforce new login
        res.clearCookie('rsp_access');
        res.clearCookie('rsp_refresh');
        res.redirect(`${config.urlRoot()}/login`);
      });
    } else {
      res.redirect(`${config.urlRoot()}/login`);
    }
  } else {
    console.log('found rsp_access cookie');
    cognitoExpress.validate(req.cookies.rsp_access.accessToken, (err) => {
      console.log('cognitoExpress.validate callback');
      if (err) {
        if (req.cookies.rsp_refresh) {
          authService.refreshAccessToken(req.cookies.rsp_refresh.refreshToken).then((token) => {
            res.cookie('rsp_access', { accessToken: token.access_token, idToken: token.id_token }, { maxAge: token.expires_in * 1000, httpOnly: true });
            res.redirect(`${config.urlRoot()}/`);
          }).catch(() => {
            // Invalid refresh token, enforce new login
            res.redirect(`${config.urlRoot()}/logout`);
          });
        } else {
          res.clearCookie('rsp_access');
          return res.redirect(`${config.urlRoot()}/login`);
        }
      } else {
        // Get user information from the ID token
        const userInfo = jwtDecode(req.cookies.rsp_access.idToken);
        // Extract and clean up roles
        const userRole = userInfo['custom:Role'].slice(1, -1).replace(/\s/g, '').split(',');
        // Ensure that user information is available through the application (including views)
        req.session.rsp_user = userInfo;
        req.session.rsp_user_role = userRole;
        console.log('userInfo[\'custom:Role\']');
        console.log(userInfo['custom:Role']);
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
          return res.render('main/forbidden', req.session);
        }
      }
      console.log('fallback forbidden render');
      return res.render('main/forbidden', req.session);
    });
  }
};
