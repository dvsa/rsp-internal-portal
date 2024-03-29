import { check } from 'express-validator';

export default [
  check('payment_code').isLength({ min: 11, max: 16 }),
  check('payment_code').trim().isAlphanumeric(),
];
