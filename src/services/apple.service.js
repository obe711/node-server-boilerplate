const httpStatus = require('http-status');
const axios = require('axios');
const NodeRSA = require('node-rsa');
const jsonwebtoken = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const userService = require('./user.service');
const logger = require('../config/logger');

const _getApplePublicKeys = async () => {
  return axios
    .request({
      method: 'GET',
      url: 'https://appleid.apple.com/auth/keys',
    })
    .then((response) => response.data.keys);
};

const getAppleUserId = async (token) => {
  const keys = await _getApplePublicKeys();
  const decodedToken = jsonwebtoken.decode(token, { complete: true });
  const { kid } = decodedToken.header;
  const key = keys.find((k) => k.kid === kid);

  const pubKey = new NodeRSA();
  pubKey.importKey(
    {
      n: Buffer.from(key.n, 'base64'),
      e: Buffer.from(key.e, 'base64'),
    },
    'components-public'
  );

  const userkey = pubKey.exportKey(['public']);

  return jsonwebtoken.verify(token, userkey, {
    algorithms: 'RS256',
  });
};

const verifyOAuthToken = async (token, firstName, lastName) => {
  try {
    const user = await getAppleUserId(token);
    logger.info(JSON.stringify({ id: 'apple data', user }, null, 2));

    const foundUser = await userService.getUserByEmail(user.email);
    if (!foundUser) {
      const newUser = await userService.createUser({
        firstName,
        lastName,
        email: user.email,
        authType: 'apple',
        role: 'user',
      });
      return newUser;
    }
    if (foundUser.authType !== 'apple') throw Error('Not apple user');
    return foundUser;
  } catch (ex) {
    logger.info(JSON.stringify(ex, null, 2));
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid user account');
  }
};

module.exports = {
  verifyOAuthToken,
};
