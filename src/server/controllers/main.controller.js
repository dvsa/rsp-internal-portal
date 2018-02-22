// Robots
export const robots = (req, res) => {
  res.type('text/plain');
  res.send('User-agent: *\nDisallow: /');
};

// Index Route
export const index = (req, res) => {
  const viewData = {
    pageBreadcrumbItems: [
      { text: 'Home', url: '#' },
    ],
  };

  res.render('main/index', viewData);
};
