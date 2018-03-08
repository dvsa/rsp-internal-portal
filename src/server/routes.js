import { Router } from 'express';

import * as mainController from './controllers/main.controller';
import * as paymentController from './controllers/payment.controller';
import * as cpmsController from './controllers/cpms.controller';
import * as penaltyController from './controllers/penalty.controller';

const router = Router();

router.get('/robots.txt', mainController.robots);

// Search Page
router.get('/', mainController.index);
router.post('/', mainController.searchPenalty);

// Get Penalty details given a payment code
router.get('/payment-code/:payment_code', paymentController.getPenaltyDetails);

// Get Penalty details given a penalty reference
router.get('/penalty/:penalty_ref', penaltyController.getPenaltyDetails);

// Mocked CMPS screens
router.get('/cpms-step-1', cpmsController.step1);
router.get('/cpms-step-2', cpmsController.step2);
router.get('/cpms-step-3', cpmsController.step3);
router.post('/cpms-step-3', cpmsController.makePayment);

export default router;
