// Robots
export const robots = (req, res) => {
  res.type('text/plain');
  res.send('User-agent: *\nDisallow: /');
};

// Index Route
export const index = (req, res) => {
  const invalidPaymentCode = Object.keys(req.query).some(param => param === 'invalidPaymentCode');
  const invalidPenaltyReference = Object.keys(req.query).some(param => param === 'invalidPenaltyReference');
  const viewData = {
    invalidPaymentCode,
    invalidPenaltyReference,
    invalid: invalidPaymentCode || invalidPenaltyReference,
    input: invalidPaymentCode ? 'payment code' : 'penalty reference',
  };

  res.render('main/index', viewData);
};

// Search by payment code or penalty reference
export const searchPenalty = (req, res) => {
  if (req.body.payment_code) {
    res.redirect(`payment-code/${req.body.payment_code}`);
  } else if (req.body.penalty_ref) {
    res.redirect(`penalty/${req.body.penalty_ref}`);
  } else {
    res.render('main/index', { invalidRequest: true });
  }
};
