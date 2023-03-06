export const AuthorizationErrorCode = {
  REFRESH_TOKEN_ERROR: 1,
  EXPIRED_TOKEN: 2,
  MISSING_ROLE: 3,
  INVALID_ROLE: 4,
  VERIFY_TOKEN_ERROR: 5,
};

export class AuthorizationError extends Error {
  constructor(message, errorCode) {
    super();
    this.message = message;
    this.code = errorCode;
  }
}
