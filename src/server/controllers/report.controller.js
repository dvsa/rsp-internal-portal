import CpmsService from '../services/cpms.service';
import config from '../config';
import logger from './../utils/logger';

const cpmsService = new CpmsService(config.cpmsServiceUrl());
const INVALID_DATE_RANGE = 'invalidDateRange';

export const renderReportFilters = async (req, res) => {
  let reportTypes;
  try {
    reportTypes = await cpmsService.getReportTypes();
    logger.info(reportTypes);
  } catch (error) {
    logger.error(error);
  }
  const invalidDateRange = Object.keys(req.query).some(param => param === INVALID_DATE_RANGE);
  res.render('reports/generateReport', { types: reportTypes, ...req.session, invalidDateRange });
};

/**
 * Validate the submitted dates are no later than today and the endDate
 * is not earlier than the start date.
 * @param {string} dateFromText End date in the format yyyy-mm-dd
 * @param {string} dateToText Start date in the format yyyy-mm-dd
 */
function validDate(dateFromText, dateToText) {
  const dateToday = new Date().setHours(0, 0, 0, 0).valueOf();
  const dateFrom = new Date(dateFromText).valueOf();
  const dateTo = new Date(dateToText).valueOf();
  const startDateBeforeEnd = dateFrom > dateTo;
  const dateNotInFuture = dateToday >= dateTo && dateToday <= dateFrom;

  return dateNotInFuture && !startDateBeforeEnd;
}

export const generateReport = (req, res) => {
  logger.info(req.body);
  const filters = { ...req.body };

  if (!validDate(filters.dateFrom, filters.dateTo)) {
    res.redirect(`reports?${INVALID_DATE_RANGE}`);
    return;
  }

  try {
    cpmsService.requestReport(filters.penaltyType, filters.reportCode, `${filters.dateFrom} 00:00:00`, `${filters.dateTo} 23:59:00`).then((response) => {
      if (response.code === '000') {
        res.render('reports/generatingReport', { reportReference: response.reference, penaltyType: filters.penaltyType, ...req.session });
      }
    });
  } catch (error) {
    logger.error(error);
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
