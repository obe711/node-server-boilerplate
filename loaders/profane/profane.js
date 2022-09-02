const mongoose = require('mongoose');
const config = require('../../src/config/config');
const wordsArray = require('./profane.json');
const { Profane } = require('../../src/models');

const logger = require('../../src/config/logger');

mongoose.connect(config.mongoose.url, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
});

const profaneObjects = wordsArray.map((word) => ({ word }));

Profane.insertMany(profaneObjects)
  .then(function () {
    logger.info('Data inserted');
    process.exit(0);
  })
  .catch(function (error) {
    logger.error(error.message);
    process.exit(1);
  });
