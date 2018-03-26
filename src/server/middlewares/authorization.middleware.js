import CognitoExpress from 'cognito-express';
import jwtDecode from 'jwt-decode';
import config from '../config';
import AuthService from '../services/auth.service';

const authService = new AuthService(config.cognitoUrl);

const cognitoExpress = new CognitoExpress({
  region: config.region,
  cognitoUserPoolId: config.userPoolId,
  tokenUse: 'access',
  tokenExpiration: 3600000,
});

export default (req, res, next) => {
  if (!req.cookies.rsp_access) {
    // If there's a refresh token on the cookies try to use that to get a new access token
    if (req.cookies.rsp_refresh) {
      authService.refreshAccessToken(req.cookies.rsp_refresh.refreshToken).then((token) => {
        res.cookie('rsp_access', { accessToken: token.access_token, idToken: token.id_token }, { maxAge: token.expires_in * 1000, httpOnly: true });
        res.redirect(`${config.urlRoot}/`);
      }).catch(() => {
        // Failed to retrieve new access token with refresh token
        // Clear up the cookies and enforce new login
        res.clearCookie('rsp_access');
        res.clearCookie('rsp_refresh');
        res.redirect(`${config.urlRoot}/login`);
      });
    } else {
      res.redirect(`${config.urlRoot}/login`);
    }
  } else {
    cognitoExpress.validate(req.cookies.rsp_access.accessToken, (err) => {
      if (err) {
        if (req.cookies.rsp_refresh) {
          authService.refreshAccessToken(req.cookies.rsp_refresh.refreshToken).then((token) => {
            res.cookie('rsp_access', { accessToken: token.access_token, idToken: token.id_token }, { maxAge: token.expires_in * 1000, httpOnly: true });
            res.redirect(`${config.urlRoot}/`);
          }).catch(() => {
            // Invalid refresh token, enforce new login
            res.redirect(`${config.urlRoot}/logout`);
          });
        } else {
          res.clearCookie('rsp_access');
          res.redirect(`${config.urlRoot}/login`);
        }
      } else {
        // Get user information from the ID token
        const userInfo = jwtDecode(req.cookies.rsp_access.idToken);

        // Ensure that user information is available through the application (including views)
        req.app.set('rsp_user', userInfo);

        next();
      }
    });
  }
};