# Logging

## Example Info

```
{
  logName: 'ReversePayment',
  details: {
    userEmail: 'rsp-admin@dvsagov.onmicrosoft.com',
    userRole: ['BankingFinance'],
    penaltyDetails: {
      complete: true,
      reference: '3875407948167',
      paymentCode: 'c08d902b25c54d44',
      penaltyIssueDate: '02/04/2019',
      vehicleReg: 'BJSSTEST',
      formattedReference: '3875407948167',
      location: 'Masonhill (A77, Ayrshire)',
      amount: 200,
      status: 'PAID',
      type: 'FPN',
      typeDescription: 'Fixed Penalty Notice',
      paymentDate: '02/04/2019',
      paymentAuthCode: '113008',
      paymentRef: 'GFPD-01-20190402-093628-CDF88AA9',
      paymentMethod: 'CARD',
      enabled: true,
      paymentCodeIssueDateTime: '02/04/2019 09:45'
    }
  }
}
```

## Example Error

```
{
  logName: 'MissingPaymentType',
  message: 'Missing payment type in makePayment request body'
}
```

## Example Network Error

```
{
  logLevel: 'ERROR',
  requestErrorMessage: {
    message: 'Received response with non 2xx status code',
    errorData: {
      message: 'Internal server error'
    },
    errorStatus: 502
  },
  serviceName: 'CPMSOrchestrationService',
  logName: 'ReverseCPMSPaymentFailed',
  details: {
    paymentMethod: 'CARD',
    isGroupPayment: false
  }
}
```

## Sensitive requests

Requests restricted to user roles or with side effects are logged with the users email and role. These include:

* Payments
* Payment reversals
* Penalty cancelations
* Report generation
* Report download
