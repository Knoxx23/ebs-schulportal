import rateLimit from 'express-rate-limit';

export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const parentActivateRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { error: 'Too many activation attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const requestResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Too many password reset requests. Please try again in 1 hour.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

export const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many password reset attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});
