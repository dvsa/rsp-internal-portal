import CpmsService from '../services/cpms.service';
import config from '../config';
import { logInfo } from '../utils/logger';
import validDateRange from '../utils/validDateRange';

const cpmsService = new CpmsService(config.cpmsServiceUrl());
const INVALID_DATE_RANGE = 'invalidDateRange';

export const renderReportFilters = async (req, res) => {
  const reportTypes = await cpmsService.getReportTypes();
  const invalidDateRange = Object.keys(req.query).some((param) => param === INVALID_DATE_RANGE);
  res.render('reports/generateReport', { types: reportTypes, ...req.session, invalidDateRange });
};

export const generateReport = async (req, res) => {
  const reportFilters = { ...req.body };

  if (!validDateRange(reportFilters.dateFrom, reportFilters.dateTo)) {
    res.redirect(`reports?${INVALID_DATE_RANGE}`);
    return;
  }

  logInfo('GenerateReport', {
    userEmail: req.session.rsp_user.email,
    userRole: req.session.rsp_user_role,
    reportFilters,
  });

  const response = await cpmsService.requestReport(
    reportFilters.penaltyType,
    reportFilters.reportCode,
    `${reportFilters.dateFrom} 00:00:00`,
    `${reportFilters.dateTo} 23:59:00`,
  );

  if (response.code === '000') {
    res.render('reports/generatingReport', { reportReference: response.reference, penaltyType: reportFilters.penaltyType, ...req.session });
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
    res.status(500).send();
  }
};

export const downloadReport = async (req, res) => {
  logInfo('DownloadReport', {
    userEmail: req.session.rsp_user.email,
    userRole: req.session.rsp_user_role,
    reportRef: req.params.report_ref,
  });

  try {
    const file = await cpmsService.downloadReport(req.query.penalty_type, req.params.report_ref);
    res.setHeader('Content-disposition', `attachment; filename=${req.query.filename}`);
    res.set('Content-Type', 'application/force-download');
    res.end(file);
  } catch (error) {
    req.status(500).send();
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
    res.status(500).send();
  }
};
