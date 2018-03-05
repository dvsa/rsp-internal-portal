import url from 'url';

// Step 1 route
export const step1 = (req, res) => {
  const { query } = url.parse(req.url, true);
  res.render('cpms/cpms-step-1', query);
};

export const step2 = (req, res) => {
  const { query } = url.parse(req.url, true);
  res.render('cpms/cpms-step-2', query);
};

export const step3 = (req, res) => {
  const { query } = url.parse(req.url, true);
  res.render('cpms/cpms-step-3', query);
};
