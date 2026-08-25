import { Router } from 'express';
import { loginSchema, registerSchema } from '@memoryvault/shared/authSchemas';
import { login, logout, me, register } from '../controllers/authController.js';
import authenticate from '../middleware/authenticate.js';
import validate from '../middleware/validate.js';
import verifyCsrf from '../middleware/verifyCsrf.js';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/logout', authenticate, verifyCsrf, logout);
router.get('/me', authenticate, me);

export default router;
