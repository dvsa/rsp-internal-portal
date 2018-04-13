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
  res.render('reports/generateReport', { types: [] });
};
