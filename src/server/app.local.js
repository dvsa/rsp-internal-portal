/* eslint-disable */
import express from 'express';
import appCreation from './app';
import config from './config';

appCreation()
  .then((app) => {
    const port = config.port();
    const assets = config.assets();
    const views = config.views();

    app.use(express.static(assets));

    app.listen(port, () => {
      console.log(`Listening at: http://localhost:${port}`);
      console.log(`Views: ${views}`);
      console.log(`Assets: ${assets}`);
    });
  })
