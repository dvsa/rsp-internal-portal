import AuthService from '../services/auth.service';
import config from '../config';

const authService = new AuthService(config.cognitoUrl);

// Robots
export const robots = (req, res) => {
  res.type('text/plain');
  res.send('User-agent: *\nDisallow: /');
};

// Index Route
export const index = (req, res) => {
  const invalidPaymentCode = Object.keys(req.query).some(param => param === 'invalidPaymentCode');
  const invalidPenaltyReference = Object.keys(req.query).some(param => param === 'invalidPenaltyReference');
  const viewData = {
    invalidPaymentCode,
    invalidPenaltyReference,
    invalid: invalidPaymentCode || invalidPenaltyReference,
    input: invalidPaymentCode ? 'payment code' : 'penalty reference',
  };

  res.render('main/index', viewData);
};

// Search by payment code or penalty reference
export const searchPenalty = (req, res) => {
  if (req.body.payment_code) {
    const normalizedCode = req.body.payment_code.replace(/\W|_/g, '').toLowerCase();
    res.redirect(`payment-code/${normalizedCode}`);
  } else if (req.body.penalty_ref) {
    res.redirect(`penalty/${req.body.penalty_ref}`);
  } else {
    res.render('main/index', { invalidRequest: true });
  }
};

export const authenticate = (req, res) => {
  const {
    identityProvider,
    redirectUri,
    clientId,
    clientSecret,
  } = config;

  const responseType = 'code';

  res.redirect(`${config.cognitoUrl}/oauth2/authorize?identity_provider=${identityProvider}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=${responseType}&client_id=${clientId}&client_secret=${clientSecret}`);
};

export const login = (req, res) => {
  if (req.query.code) {
    authService.requestAccessToken(req.query.code).then((token) => {
      res.cookie('rsp_access', { accessToken: token.access_token, idToken: token.id_token }, { maxAge: token.expires_in * 1000, httpOnly: true });
      res.cookie('rsp_refresh', { refreshToken: token.refresh_token }, { maxAge: 2592000000, httpOnly: true });
      res.redirect(`${config.urlRoot}/`);
    }).catch(() => {
      // Failed to get an access token - Get a new authorization code and try again
      authenticate(req, res);
    });
  } else {
    authenticate(req, res);
  }
};

export const logout = (req, res) => {
  res.clearCookie('rsp_access');
  res.clearCookie('rsp_refresh');
  res.redirect(`${config.cognitoUrl}/logout?client_id=${config.clientId}&logout_uri=${encodeURIComponent(config.redirectUri)}`);
};
