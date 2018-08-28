import * as _ from 'lodash';
import AuthService from '../services/auth.service';
import config from '../config';
import logger from '../utils/logger';
import PenaltyService from '../services/penalty.service';

const authService = new AuthService(config.cognitoUrl);
const penaltyService = new PenaltyService(config.penaltyServiceUrl);

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
  const invalidReg = Object.keys(req.query).some(param => param === 'invalidReg');

  const viewData = {
    invalidPaymentCode,
    invalidCDN,
    invalidFPN,
    invalidIM,
    invalidReg,
    invalid: invalidPaymentCode || invalidCDN || invalidFPN
      || invalidIM,
    input: invalidPaymentCode ? 'payment code' : 'penalty reference',
  };

  res.render('main/index', viewData);
};

const getSearchDetails = async (form) => {
  // Clean up empty properties
  const search = _.omitBy(form, _.isEmpty);

  const isSearchByCode = search['search-by'] === 'code';
  const isSearchByReg = search['search-by'] === 'vehicle-reg';
  let value;
  let penaltyType;

  if (isSearchByCode) {
    value = search.payment_code ? search.payment_code.replace(/\W|_/g, '').toLowerCase() : null;
  } else if (isSearchByReg) {
    try {
      const docOrGroup = await penaltyService.searchByRegistration(search.vehicle_reg);
      value = docOrGroup.Value ? docOrGroup.Value.paymentCode : docOrGroup.ID;
    } catch (error) {
      logger.error(error);
      value = null;
    }
  } else {
    // Get the penalty type
    const key = `penalty_ref_${search['search-by']}`;
    penaltyType = search['search-by'];

    // Infer penalty ID from penalty reference and penalty Type
    // penalty ID = penaltyReference_penaltyType
    // Immobilisation references need to be parsed so that they don't
    // contain separators and use padding (with zeros) instead
    if (penaltyType === 'IM') {
      const sections = search[key] ? search[key].split('-') : null;
      value = sections ? `${_.padStart(sections[0], 6, 0)}${sections[1]}${_.padStart(sections[2], 6, 0)}_${penaltyType}` : '_IM';
    } else {
      value = `${search[key]}_${penaltyType}`;
    }
  }

  return { isSearchByCode, isSearchByReg, value };
};

// Search by payment code or penalty reference
export const searchPenalty = async (req, res) => {
  const searchDetails = await getSearchDetails(req.body);
  const { value } = searchDetails;
  if (searchDetails.isSearchByCode) {
    res.redirect(`payment-code/${value}`);
  } else if (searchDetails.isSearchByReg) {
    const path = value !== null ? `payment-code/${value}` : '/?invalidReg';
    res.redirect(path);
  } else {
    res.redirect(`penalty/${value}`);
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
