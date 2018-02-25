import { check } from 'express-validator/check';

export default [
  check('payment_code').isLength({ min: 16, max: 16 }),
  check('payment_code').trim().isHexadecimal(),
];
