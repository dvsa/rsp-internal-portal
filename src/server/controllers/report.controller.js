/* eslint-disable */
import CpmsService from '../services/cpms.service';
import config from '../config';
import logger from './../utils/logger';

const cpmsService = new CpmsService(config.cpmsServiceUrl);

export const renderReportFilters = async (req, res) => {
  let reportTypes;
  try {
    reportTypes = await cpmsService.getReportTypes();
    logger.info(reportTypes);
  } catch (error) {
    logger.error(error);
  }
  res.render('reports/generateReport', { types: reportTypes });
};

export const generateReport = (req, res) => {
  logger.info(req.body);
  const filters = { ...req.body };
  try {
    cpmsService.requestReport(filters.penaltyType, filters.reportCode, `${filters.dateFrom} 00:00:00`, `${filters.dateTo} 23:59:00`).then((response) => {
      if (response.code === '000') {
        res.render('reports/generatingReport', { reportReference: response.reference, penaltyType: filters.penaltyType });
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
        downloadUrl: `${config.urlRoot}/reports/${req.params.report_ref}/download?penalty_type=${req.query.penalty_type}&filename=${filename}`,
        penaltyType: req.params.penalty_type,
        filename,
      });
    } else {
      res.redirect(`${config.urlRoot}/reports/${req.params.report_ref}/status?penalty_type=${req.query.penalty_type}`);
    }
  } catch (error) {
    logger.error(error);
    res.status(500).send();
  }
};
