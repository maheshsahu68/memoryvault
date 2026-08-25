import { Router } from 'express';
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from '@memoryvault/shared/authSchemas';
import { forgotPassword, login, logout, me, refresh, register, resetPassword } from '../controllers/authController.js';
import authenticate from '../middleware/authenticate.js';
import validate from '../middleware/validate.js';
import verifyCsrf from '../middleware/verifyCsrf.js';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/logout', authenticate, verifyCsrf, logout);
router.get('/me', authenticate, me);
router.post('/refresh', verifyCsrf, refresh);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password/:token', validate(resetPasswordSchema), resetPassword);

export default router;
