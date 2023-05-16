const httpStatus = require('http-status');
const axios = require('axios');
const NodeRSA = require('node-rsa');
const jsonwebtoken = require('jsonwebtoken');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');
const ApiError = require('../utils/ApiError');
const userService = require('./user.service');
const logger = require('../config/logger');
const config = require('../config/config');

const _getApplePublicKeys = async () => {
  return axios
    .request({
      method: 'GET',
      url: 'https://appleid.apple.com/auth/keys',
    })
    .then((response) => response.data.keys);
};

const createClientSecret = async () => {
  const privateKey = fs.readFileSync(path.join(process.cwd(), '.keys', config.oauth.apple.key_filename));
  const payload = {
    iss: config.oauth.apple.teamId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 14777000,
    aud: 'https://appleid.apple.com',
    sub: config.oauth.apple.client_id,
  };
  const token = await jsonwebtoken.sign(payload, privateKey, { algorithm: 'ES256', keyid: config.oauth.apple.keyId });
  return token;
};

const revokeAppleTokens = async (token) => {
  const clientSecret = await createClientSecret();
  const params = new url.URLSearchParams({ client_id: config.oauth.apple.client_id, client_secret: clientSecret, token });
  const res = await axios.post('https://appleid.apple.com/auth/revoke/', params.toString());
  return res.data;
};

const generateAppleAuthTokens = async (code) => {
  const clientSecret = await createClientSecret();
  const params = new url.URLSearchParams({
    client_id: config.oauth.apple.client_id,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
  });
  const res = await axios.post('https://appleid.apple.com/auth/token/', params.toString());
  return res.data;
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
        firstName: !firstName ? 'n/a' : firstName,
        lastName: !lastName ? 'n/a' : lastName,
        email: user.email,
        authType: 'apple',
        role: 'user',
      });
      return newUser;
    }
    if (config.oauth.strictMode && foundUser.authType !== 'apple') throw Error('Not apple user');
    return foundUser;
  } catch (ex) {
    logger.info(JSON.stringify(ex, null, 2));
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid user account');
  }
};

module.exports = {
  verifyOAuthToken,
  generateAppleAuthTokens,
  revokeAppleTokens,
};
