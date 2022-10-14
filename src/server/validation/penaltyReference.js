import { check } from 'express-validator';

export default [
  check('penalty_id').isLength({ min: 8, max: 18 }),
  check('penalty_id').matches(/^[a-zA-Z0-9_-]+$/),
];
