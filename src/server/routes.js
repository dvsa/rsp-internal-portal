import { Router } from 'express';
import authorizationMiddleware from './middlewares/authorization.middleware';
import * as mainController from './controllers/main.controller';
import * as paymentCodeController from './controllers/paymentCode.controller';
import * as paymentController from './controllers/payment.controller';
import * as penaltyController from './controllers/penalty.controller';
import * as reportController from './controllers/report.controller';
import receiptController from './controllers/receipt.controller';
import financeUsersAuthorizationMiddleware from './middlewares/financeUsersAuthorization.middleware';

const router = Router();

router.get('/robots.txt', mainController.robots);

// Search Page
router.get('/', authorizationMiddleware, mainController.index);
router.post('/', authorizationMiddleware, mainController.searchPenalty);
router.get('/vehicle-reg-search-results/:vehicle_reg', mainController.normaliseRegistration, mainController.searchVehicleReg);

router.get('/login', mainController.login);
router.post('/login', mainController.authenticate);
router.get('/logout', mainController.logout);

// Get Penalty details given a payment code
router.get('/payment-code/:payment_code', paymentCodeController.getPenaltyDetails);
router.post('/payment-code/:payment_code/cancel', paymentCodeController.cancelPaymentCode);
router.get('/payment-code/:payment_code/payment', paymentCodeController.validatePaymentCode, paymentController.renderPaymentPage);
router.get('/payment-code/:payment_code/:type/payment', paymentCodeController.validatePaymentCode, paymentController.renderGroupPaymentPage);
router.post('/payment-code/:payment_code/payment', paymentCodeController.validatePaymentCode, paymentController.makePayment);
router.post('/payment-code/:payment_code/:type/payment', paymentController.makeGroupPayment);
router.get('/payment-code/:payment_code/confirmPayment', paymentController.confirmPayment);
router.get('/payment-code/:payment_code/:type/confirmGroupPayment', paymentController.confirmGroupPayment);
router.post('/payment-code/:payment_code/reversePayment', financeUsersAuthorizationMiddleware, paymentController.reversePayment);
router.post('/payment-code/:payment_code/:type/reverseGroupPayment', financeUsersAuthorizationMiddleware, paymentController.reverseGroupPayment);
router.get('/payment-code/:payment_code/:type/details', paymentCodeController.getPenaltyGroupBreakdownForType);
router.get('/payment-code/:payment_code/:type/receipt', receiptController);

// Get Penalty details given a penalty reference
router.get('/penalty/:penalty_id', penaltyController.getPenaltyDetails);
router.post('/penalty/:penalty_id/cancel', penaltyController.cancelPenalty);
router.get('/penalty/:penalty_id/payment', paymentController.renderPaymentPage);

// Reports
router.get('/reports', authorizationMiddleware, financeUsersAuthorizationMiddleware, reportController.renderReportFilters);
router.post('/reports', financeUsersAuthorizationMiddleware, reportController.generateReport);
router.get('/reports/:report_ref/', financeUsersAuthorizationMiddleware, reportController.showDetails);
router.get('/reports/:report_ref/status', financeUsersAuthorizationMiddleware, reportController.checkReportStatus);
router.get('/reports/:report_ref/download', financeUsersAuthorizationMiddleware, reportController.downloadReport);

export default router;
