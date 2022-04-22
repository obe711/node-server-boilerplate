const httpStatus = require('http-status');
const { OAuth2Client } = require('google-auth-library');
const ApiError = require('../utils/ApiError');
const userService = require('./user.service');
const config = require('../config/config');
const logger = require('../config/logger');
// Google Oauth2
const client = new OAuth2Client(config.oauth.google.client_id);

/**
 * Verify Google Oauth2 token
 * @param {string} token
 * @returns {Promise<User>}
 */
const verifyOAuthToken = async (token) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: config.oauth.google.client_id,
    });

    const payload = ticket.getPayload();
    logger.info(JSON.stringify({ id: 'google data', payload }, null, 2));
    const user = await userService.getUserByEmail(payload.email);
    if (!user) {
      const newUser = await userService.createUser({
        firstName: payload.given_name,
        lastName: payload.family_name,
        email: payload.email,
        authType: 'google',
        role: 'user',
      });

      return newUser;
    }
    if (user.authType !== 'google') throw Error('Not google user');
    return user;
  } catch (ex) {
    logger.info(JSON.stringify(ex, null, 2));
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid user account');
  }
};

module.exports = {
  verifyOAuthToken,
};
