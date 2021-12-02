const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const config = require('../config/config');
const { authService, userService, tokenService, emailService } = require('../services');

const register = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);
  const tokens = await tokenService.generateAuthTokens(user);
  res.status(httpStatus.CREATED).send({ user, tokens });
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.loginUserWithEmailAndPassword(email, password);
  const tokens = await tokenService.generateAuthTokens(user);
  setTokenCookie(res, tokens.refresh);
  res.send({ user, tokens });
});

const logout = catchAsync(async (req, res) => {
  await authService.logout(req.body.refreshToken);
  expireTokenCookie(res);
  res.status(httpStatus.NO_CONTENT).send();
});

const refreshTokens = catchAsync(async (req, res) => {
  const tokens = await authService.refreshAuth(req.cookies[config.jwt.refreshCookieName] || req.body.refreshToken);
  setTokenCookie(res, tokens.refresh);
  res.send({ ...tokens });
});

const forgotPassword = catchAsync(async (req, res) => {
  const resetPasswordToken = await tokenService.generateResetPasswordToken(req.body.email);
  await emailService.sendResetPasswordEmail(req.body.email, resetPasswordToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req.query.token, req.body.password);
  res.status(httpStatus.NO_CONTENT).send();
});

const sendVerificationEmail = catchAsync(async (req, res) => {
  const verifyEmailToken = await tokenService.generateVerifyEmailToken(req.user);
  await emailService.sendVerificationEmail(req.user.email, verifyEmailToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const verifyEmail = catchAsync(async (req, res) => {
  await authService.verifyEmail(req.query.token);
  res.status(httpStatus.NO_CONTENT).send();
});


module.exports = {
  register,
  login,
  logout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
};

function setTokenCookie(res, tokenData) {
  const { expires, token } = tokenData;
  const cookieRefreshOptions = {
    httpOnly: true,
    expires: new Date(expires),
  };
  res.cookie(config.jwt.refreshCookieName, token, cookieRefreshOptions);
}
function expireTokenCookie(res) {
  const expireCookieOptions = {
    httpOnly: true,
    expires: new Date(Date.now() - 60 * 1000 * 60 * 24 * 31),
  };
  res.cookie(config.jwt.refreshCookieName, 'x', expireCookieOptions);
}
