import { Router } from 'express';
import authorizationMiddleware from './middlewares/authorization.middleware';
import * as mainController from './controllers/main.controller';
import * as paymentCodeController from './controllers/paymentCode.controller';
import * as paymentController from './controllers/payment.controller';
import * as penaltyController from './controllers/penalty.controller';
import * as reportController from './controllers/report.controller';

const router = Router();

router.get('/robots.txt', mainController.robots);

// Search Page
router.get('/', authorizationMiddleware, mainController.index);
router.post('/', authorizationMiddleware, mainController.searchPenalty);

router.get('/login', mainController.login);
router.post('/login', mainController.authenticate);
router.get('/logout', mainController.logout);

// Get Penalty details given a payment code
router.get('/payment-code/:payment_code', paymentCodeController.getPenaltyDetails);
router.get('/payment-code/:payment_code/payment', paymentCodeController.validatePaymentCode, paymentController.renderPaymentPage);
router.post('/payment-code/:payment_code/payment', paymentCodeController.validatePaymentCode, paymentController.makePayment);
router.get('/payment-code/:payment_code/confirmPayment', paymentController.confirmPayment);
router.post('/payment-code/:payment_code/reversePayment', paymentController.reversePayment);

// Get Penalty details given a penalty reference
router.get('/penalty/:penalty_id', penaltyController.getPenaltyDetails);
router.get('/penalty/:penalty_id/payment', paymentController.renderPaymentPage);

// Reports
router.get('/reports', authorizationMiddleware, reportController.renderReportFilters);
router.post('/reports', reportController.generateReport);
router.get('/reports/:report_ref/', reportController.showDetails);
router.get('/reports/:report_ref/status', reportController.checkReportStatus);
router.get('/reports/:report_ref/download', reportController.downloadReport);

export default router;
