import { Router } from 'express';
import authorizationMiddleware from './middlewares/authorization.middleware';
import * as mainController from './controllers/main.controller';
import * as cookiePreferencesController from './controllers/cookiePreferences.controller';
import * as cookieDetailsController from './controllers/cookieDetails.controller';
import * as paymentCodeController from './controllers/paymentCode.controller';
import * as paymentController from './controllers/payment.controller';
import * as penaltyController from './controllers/penalty.controller';
import * as reportController from './controllers/report.controller';
import receiptController from './controllers/receipt.controller';
import { reportsAuthorizer, reversePaymentAuthorizer } from './middlewares/financeUsersAuthorization.middleware';

const router = Router();

router.get('/robots.txt', mainController.robots);

// Search Page
router.get('/', authorizationMiddleware, mainController.index);
router.post('/', authorizationMiddleware, mainController.searchPenalty);
router.get('/vehicle-reg-search-results/:vehicle_reg', authorizationMiddleware, mainController.normaliseRegistration, mainController.searchVehicleReg);

router.get('/login', mainController.login);
router.post('/login', mainController.authenticate);
router.get('/logout', mainController.logout);

// Cookie Settings
router.get('/cookie-preferences', cookiePreferencesController.index);

// Cookie Details
router.get('/cookie-details', cookieDetailsController.index);

// Get Penalty details given a payment code
router.get('/payment-code/:payment_code', authorizationMiddleware, paymentCodeController.getPenaltyDetails);
router.post('/payment-code/:payment_code/cancel', authorizationMiddleware, paymentCodeController.cancelPaymentCode);
router.get('/payment-code/:payment_code/payment', authorizationMiddleware, paymentCodeController.validatePaymentCode, paymentController.renderPaymentPage);
router.get('/payment-code/:payment_code/:type/payment', authorizationMiddleware, paymentCodeController.validatePaymentCode, paymentController.renderGroupPaymentPage);
router.post('/payment-code/:payment_code/payment', authorizationMiddleware, paymentCodeController.validatePaymentCode, paymentController.makePayment);
router.post('/payment-code/:payment_code/:type/payment', authorizationMiddleware, paymentController.makeGroupPayment);
router.get('/payment-code/:payment_code/confirmPayment', authorizationMiddleware, paymentController.confirmPayment);
router.get('/payment-code/:payment_code/:type/confirmGroupPayment', authorizationMiddleware, paymentController.confirmGroupPayment);
router.post('/payment-code/:payment_code/reversePayment', authorizationMiddleware, reversePaymentAuthorizer, paymentController.reversePayment);
router.post('/payment-code/:payment_code/:type/reverseGroupPayment', authorizationMiddleware, reversePaymentAuthorizer, paymentController.reverseGroupPayment);
router.get('/payment-code/:payment_code/:type/details', authorizationMiddleware, paymentCodeController.getPenaltyGroupBreakdownForType);
router.get('/payment-code/:payment_code/:type/receipt', authorizationMiddleware, receiptController);

// Get Penalty details given a penalty reference
router.get('/penalty/:penalty_id', authorizationMiddleware, penaltyController.getPenaltyDetails);
router.post('/penalty/:penalty_id/cancel', authorizationMiddleware, penaltyController.cancelPenalty);
router.get('/penalty/:penalty_id/payment', authorizationMiddleware, paymentController.renderPaymentPage);

// Reports
router.get('/reports', authorizationMiddleware, reportsAuthorizer, reportController.renderReportFilters);
router.post('/reports', authorizationMiddleware, reportsAuthorizer, reportController.generateReport);
router.get('/reports/:report_ref/', authorizationMiddleware, reportsAuthorizer, reportController.showDetails);
router.get('/reports/:report_ref/status', authorizationMiddleware, reportsAuthorizer, reportController.checkReportStatus);
router.get('/reports/:report_ref/download', authorizationMiddleware, reportsAuthorizer, reportController.downloadReport);

export default router;
