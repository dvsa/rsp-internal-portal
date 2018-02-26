import { check } from 'express-validator/check';

export default [
  check('penalty_ref').isLength({ min: 8, max: 18 }),
  check('penalty_ref').matches(/^[a-zA-Z0-9_-]+$/),
];
