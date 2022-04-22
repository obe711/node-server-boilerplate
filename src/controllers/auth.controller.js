const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const config = require('../config/config');
const {
  authService,
  userService,
  tokenService,
  emailService,
  cookieService,
  appleService,
  googleService,
} = require('../services');

const register = catchAsync(async (req, res) => {
  Object.assign(req.body, { authType: 'email' });
  const user = await userService.createUser(req.body);
  const tokens = await tokenService.generateAuthTokens(user);
  res.status(httpStatus.CREATED).send({ user, tokens });
});

const loginEmail = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.loginUserWithEmailAndPassword(email, password);
  const tokens = await tokenService.generateAuthTokens(user);
  cookieService.setTokenCookie(res, tokens.refresh);
  res.send({ user, tokens });
});

// loginGoogle
const loginGoogle = catchAsync(async (req, res) => {
  const user = await googleService.verifyOAuthToken(req.body.token);
  const tokens = await tokenService.generateAuthTokens(user);
  cookieService.setTokenCookie(res, tokens.refresh);
  res.send({ user, tokens });
});

// loginApple
const loginApple = catchAsync(async (req, res) => {
  const user = await appleService.verifyOAuthToken(req.body.token);
  const tokens = await tokenService.generateAuthTokens(user);
  cookieService.setTokenCookie(res, tokens.refresh);
  res.send({ user, tokens });
});

const logout = catchAsync(async (req, res) => {
  await authService.logout(req.body.refreshToken);
  cookieService.expireTokenCookie(res);
  res.status(httpStatus.NO_CONTENT).send();
});

const refreshTokens = catchAsync(async (req, res) => {
  const { user, tokens } = await authService.refreshAuth(req.cookies[config.jwt.refreshCookieName] || req.body.refreshToken);
  cookieService.setTokenCookie(res, tokens.refresh);
  res.send({ user, tokens });
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
  loginEmail,
  loginApple,
  loginGoogle,
  logout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
};
