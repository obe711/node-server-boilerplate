const Converter = require('openapi-to-postmanv2');

module.exports = (openapiData) => (req, res, next) => {
  Converter.convert({ type: 'string', data: openapiData }, {}, (err, conversionResult) => {
    if (!conversionResult.result) {
      next(conversionResult.reason);
    } else {
      res.send(conversionResult.output[0].data);
    }
  });
};
