import CpmsService from '../services/cpms.service';
import config from '../config';
import logger from './../utils/logger';
import validDateRange from '../utils/validDateRange';

const cpmsService = new CpmsService(config.cpmsServiceUrl());
const INVALID_DATE_RANGE = 'invalidDateRange';
const INVALID_SCHEME = 'invalidScheme';

export const renderReportFilters = async (req, res) => {
  let reportTypes;
  try {
    reportTypes = await cpmsService.getReportTypes();
    logger.info(reportTypes);
  } catch (error) {
    logger.error(error);
  }
  const invalidDateRange = Object.keys(req.query).some(param => param === INVALID_DATE_RANGE);
  const invalidScheme = Object.keys(req.query).some(param => param === INVALID_SCHEME);
  res.render('reports/generateReport', {
    types: reportTypes, ...req.session, invalidDateRange, invalidScheme,
  });
};


const mockReport = (
  reportId, userName, dateTime, startDate, endDate,
  scheme, reportType, status,
) => ({
  reportId,
  creatorUserName: userName,
  dateTime,
  startDate,
  endDate,
  scheme,
  reportType,
  status,
});

export const renderReportHistory = (req, res) => {
  const reports = [
    mockReport('ECMS-61145-16112', 'James Highfield', '17/05/2019 14:56', '17/05/2019', '17/05/2019', 'ECMS', 'All Payments', 'Pending'),
    mockReport('ECMS-74123-62411', 'James Highfield', '17/05/2019 09:00', '17/05/2019', '17/05/2019', 'ECMS', 'AR/AP Report', 'Complete'),
    mockReport('MOT2-87677-52311', 'James Highfield', '17/05/2019 09:00', '17/05/2019', '17/05/2019', 'MOT2', 'General Ledger Sales', 'Complete'),
    mockReport('COUR-15611-62415', 'James Highfield', '17/05/2019 09:00', '17/05/2019', '17/05/2019', 'COURT', 'Daily Balance', 'Complete'),
    mockReport('MOT2-63221-16143', 'James Highfield', '16/05/2019 09:00', '16/05/2019', '16/05/2019', 'MOT2', 'Daily Banking', 'Complete'),
    mockReport('ECMS-86866-72422', 'James Highfield', '16/05/2019 14:56', '15/05/2019', '16/05/2019', 'ECMS', 'All Payments', 'Complete'),
    mockReport('GFPD-16161-62356', 'James Highfield', '16/05/2019 14:56', '14/05/2019', '16/05/2019', 'GFPDS', 'Transaction Breakdown', 'Failed'),
    mockReport('COUR-72234-14616', 'James Highfield', '15/05/2019 14:56', '14/05/2019', '14/05/2019', 'COURT', 'User Closure', 'Complete'),
    mockReport('OLNI-25123-31221', 'James Highfield', '15/05/2019 14:56', '14/05/2019', '14/05/2019', 'OLNI', 'AR/AP Report', 'Complete'),
    mockReport('GFPD-97621-90019', 'James Highfield', '14/05/2019 14:56', '10/05/2019', '14/05/2019', 'GFPDS', 'All Payments', 'Complete'),
    mockReport('OLCS-46411-46114', 'James Highfield', '14/05/2019 14:56', '14/05/2019', '14/05/2019', 'OLCS', 'Daily Banking', 'Complete'),
  ];

  res.render('reports/reportHistory', {
    ...req.session,
    reports,
  });
};

export const generateReport = async (req, res) => {
  logger.info(req.body);
  const filters = { ...req.body };

  if (!validDateRange(filters.dateFrom, filters.dateTo)) {
    res.redirect(`reports?${INVALID_DATE_RANGE}`);
    return;
  }

  if (filters.penaltyType === undefined) {
    res.redirect(`reports?${INVALID_SCHEME}`);
    return;
  }

  try {
    const response = await cpmsService.requestReport(filters.penaltyType, filters.reportCode, `${filters.dateFrom} 00:00:00`, `${filters.dateTo} 23:59:00`);

    if (response.code === '000') {
      res.render('reports/generatingReport', { reportReference: response.reference, penaltyType: filters.penaltyType[0], ...req.session });
    }
  } catch (err) {
    logger.error(err);
  }
};

export const checkReportStatus = async (req, res) => {
  try {
    const status = await cpmsService.checkReportStatus(
      req.query.penalty_type,
      req.params.report_ref,
    );

    res.status(200).send(status);
  } catch (error) {
    logger.error(error);
    res.status(500).send();
  }
};

export const downloadReport = async (req, res) => {
  console.log(`Downloading report. Penalty type: ${req.query.penalty_type}`);
  try {
    const file = await cpmsService.downloadReport(req.query.penalty_type, req.params.report_ref);
    res.setHeader('Content-disposition', `attachment; filename=${req.query.filename}`);
    res.set('Content-Type', 'application/force-download');
    res.end(file);
  } catch (error) {
    logger.error(error);
  }
};

export const showDetails = async (req, res) => {
  try {
    const status = await cpmsService.checkReportStatus(
      req.query.penalty_type,
      req.params.report_ref,
    );

    if (status.completed === true) {
      const filename = `${status.report_type.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.${status.file_extension}`;
      res.render('reports/downloadReport', {
        downloadUrl: `${config.urlRoot()}/reports/${req.params.report_ref}/download?penalty_type=${req.query.penalty_type}&filename=${filename}`,
        penaltyType: req.params.penalty_type,
        filename,
        ...req.session,
      });
    } else {
      res.redirect(`${config.urlRoot()}/reports/${req.params.report_ref}/status?penalty_type=${req.query.penalty_type}`);
    }
  } catch (error) {
    logger.error(error);
    res.status(500).send();
  }
};
