import { Router } from 'express';
import authorizationMiddleware from './middlewares/authorization.middleware';
import * as mainController from './controllers/main.controller';
import * as paymentCodeController from './controllers/paymentCode.controller';
import * as paymentController from './controllers/payment.controller';
import * as cpmsController from './controllers/cpms.controller';
import * as penaltyController from './controllers/penalty.controller';

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
router.post('/payment-code/:payment_code/payment', paymentController.makePayment);
// Get Penalty details given a penalty reference
router.get('/penalty/:penalty_ref', penaltyController.getPenaltyDetails);
router.get('/penalty/:penalty_ref/payment', paymentController.renderPaymentPage);

// Mocked CMPS screens
router.get('/cpms-step-1', cpmsController.step1);
router.get('/cpms-step-2', cpmsController.step2);
router.get('/cpms-step-3', cpmsController.step3);
router.post('/cpms-step-3', cpmsController.makePayment);

export default router;
