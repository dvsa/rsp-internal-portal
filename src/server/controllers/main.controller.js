/* eslint-disable no-use-before-define */
import * as _ from 'lodash';
import moment from 'moment-timezone';

import AuthService from '../services/auth.service';
import config from '../config';
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
    input: invalidPaymentCode ? 'payment code' : 'fine reference',
  };

  res.render('main/index', viewData);
};

const getSearchDetails = async (form) => {
  // Clean up empty properties
  const search = _.omitBy(form, _.isEmpty);

  const isSearchByCode = search['search-by'] === 'code';
  let value;
  let penaltyType;

  if (isSearchByCode) {
    value = search.payment_code ? search.payment_code.replace(/\W|_/g, '').toLowerCase() : null;
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

  return { isSearchByCode, value };
};

// Search by payment code or penalty reference
export const searchPenalty = async (req, res) => {
  if (req.body['search-by'] === 'vehicle-reg') {
    const vehicleReg = req.body.vehicle_reg;
    return res.redirect(`${config.urlRoot}/vehicle-reg-search-results/${vehicleReg}`);
  }
  const searchDetails = await getSearchDetails(req.body);
  const { value } = searchDetails;
  if (searchDetails.isSearchByCode) {
    return res.redirect(`${config.urlRoot}/payment-code/${value}`);
  }
  return res.redirect(`penalty/${value}`);
};

export const searchVehicleReg = async (req, res) => {
  try {
    const reg = req.params.vehicle_reg;
    const searchResult = await penaltyService.searchByRegistration(reg);
    handleVehicleRegSearchResults(res, reg, searchResult);
  } catch (error) {
    res.redirect('/?invalidReg');
  }
};

const handleVehicleRegSearchResults = (res, vehicleReg, value) => {
  const { Penalties, PenaltyGroups } = value;
  const numberOfResults = Penalties.length + PenaltyGroups.length;
  if (numberOfResults === 1) {
    const paymentCode = Penalties.length === 1
      ? Penalties[0].Value.paymentToken : PenaltyGroups[0].ID;
    res.redirect(`/payment-code/${paymentCode}`);
  } else {
    const viewData = generateSearchResultViewData(vehicleReg, Penalties, PenaltyGroups);
    res.render('penalty/vehicleRegSearchResults', viewData);
  }
};

const generateSearchResultViewData = (vehicleReg, penalties, penaltyGroups) => {
  const tzLocation = 'Europe/London';
  const dateFormat = 'DD/MM/YYYY HH:mm';

  const penaltyGroupsMapping = penaltyGroups.map(penaltyGroup => ({
    paymentCode: penaltyGroup.ID,
    paymentStatus: penaltyGroup.Enabled ? penaltyGroup.PaymentStatus : 'CANCELLED',
    summary: summarisePenaltyGroup(penaltyGroup),
    date: penaltyGroup.Timestamp,
    formattedDate: moment.tz(penaltyGroup.Timestamp * 1000, tzLocation).format(dateFormat),
  }));
  const penaltyMapping = penalties.map(penalty => ({
    paymentCode: penalty.Value.paymentToken,
    paymentStatus: penalty.Enabled ? penalty.Value.paymentStatus || 'UNPAID' : 'CANCELLED',
    summary: summarisePenalty(penalty),
    date: penalty.Value.dateTime,
    formattedDate: moment.tz(penalty.Value.dateTime * 1000, tzLocation).format(dateFormat),
  }));
  const results = _.flatten([penaltyGroupsMapping, penaltyMapping]);

  return {
    vehicleReg,
    results,
  };
};

const summarisePenaltyGroup = (penaltyGroup) => {
  const grouping = _.groupBy(penaltyGroup.PenaltyDocumentIds, (id) => {
    const type = id.split('_')[1];
    return type === 'IM' ? 'immobilisation' : 'penalty';
  });
  const penaltyLabel = grouping.penalty.length === 1 ? 'penalty' : 'penalties';
  const penaltyDesc = `${grouping.penalty.length} ${penaltyLabel}`;
  const afterPenaltyDesc = grouping.immobilisation !== undefined ? ' + immobilisation' : '';
  return `${penaltyDesc}${afterPenaltyDesc}`;
};

const summarisePenalty = (penalty) => {
  const descriptionMap = {
    FPN: 'penalty',
    CDN: 'penalty',
    IM: 'immobilisation',
  };
  const typeName = descriptionMap[penalty.ID.split('_')[1]];
  return `1 ${typeName}`;
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
