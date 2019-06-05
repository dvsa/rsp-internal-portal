export const ServiceName = {
  Payments: 'PaymentsService',
  CPMS: 'CPMSOrchestrationService',
  Documents: 'DocumentsService',
};

export function logInfo(logName, message) {
  console.log(JSON.stringify({
    logName,
    message,
    logLevel: 'INFO',
  }, null, 2));
}

export function logError(logName, message) {
  console.error(JSON.stringify({
    logName,
    message,
    logLevel: 'ERROR',
  }, null, 2));
}

function errorMessageFromAxiosError(error) {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    const { data, status } = error.response;
    return {
      errorData: data,
      errorStatus: status,
    };
  }

  if (error.request) {
    return {
      message: 'The request was made but no response was received',
      request: error.request,
    };
  }
  return {
    errorMessage: error.message,
  };
}

export function logAxiosError(logName, serviceName, error, details) {
  const message = errorMessageFromAxiosError(error);

  const log = {
    logName,
    serviceName,
    requestErrorMessage: message,
    logLevel: 'ERROR',
  };

  if (details !== undefined) {
    log.details = details;
  }

  console.error(JSON.stringify(log, null, 2));
}
