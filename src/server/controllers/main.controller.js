import * as _ from 'lodash';
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
  const invalidCDN = Object.keys(req.query).some(param => param === 'invalidCDN');
  const invalidFPN = Object.keys(req.query).some(param => param === 'invalidFPN');
  const invalidIM = Object.keys(req.query).some(param => param === 'invalidIM');

  const viewData = {
    invalidPaymentCode,
    invalidCDN,
    invalidFPN,
    invalidIM,
    invalid: invalidPaymentCode || invalidCDN || invalidFPN
      || invalidIM,
    input: invalidPaymentCode ? 'payment code' : 'penalty reference',
  };

  res.render('main/index', viewData);
};

const getSearchDetails = (form) => {
  // Clean up empty properties
  const search = _.omitBy(form, _.isEmpty);

  const isSearchByCode = search['search-by'] === 'code';
  let value;
  let penaltyType;

  if (isSearchByCode) {
    value = search.payment_code.replace(/\W|_/g, '').toLowerCase();
  } else {
    // Get the penalty type
    const key = `penalty_ref_${search['search-by']}`;
    penaltyType = search['search-by'];

    // Infer penalty ID from penalty reference and penalty Type
    // penalty ID = penaltyReference_penaltyType
    // Immobilisation references need to be parsed so that they don't
    // contain separators and use padding (with zeros) instead
    if (penaltyType === 'IM') {
      const sections = search[key].split('-');
      value = `${_.padStart(sections[0], 6, 0)}${sections[1]}${_.padStart(sections[2], 6, 0)}_${penaltyType}`;
    } else {
      value = `${search[key]}_${penaltyType}`;
    }
  }

  return { isSearchByCode, value };
};

// Search by payment code or penalty reference
export const searchPenalty = (req, res) => {
  const searchDetails = getSearchDetails(req.body);

  if (searchDetails.isSearchByCode) {
    res.redirect(`payment-code/${searchDetails.value}`);
  } else {
    res.redirect(`penalty/${searchDetails.value}`);
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
