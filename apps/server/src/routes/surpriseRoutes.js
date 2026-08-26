import { Router } from 'express';
import { mongoIdSchema, surpriseCreateSchema, surpriseListQuerySchema, surpriseUpdateSchema } from '@memoryvault/shared/surpriseSchemas';
import { create, duplicate, getById, list, remove, update } from '../controllers/surpriseController.js';
import authenticate from '../middleware/authenticate.js';
import validate from '../middleware/validate.js';
import verifyCsrf from '../middleware/verifyCsrf.js';

const router = Router();
router.use(authenticate);
router.get('/', validate(surpriseListQuerySchema, 'query'), list);
router.post('/', verifyCsrf, validate(surpriseCreateSchema), create);
router.get('/:id', validate(mongoIdSchema, 'params'), getById);
router.patch('/:id', verifyCsrf, validate(mongoIdSchema, 'params'), validate(surpriseUpdateSchema), update);
router.delete('/:id', verifyCsrf, validate(mongoIdSchema, 'params'), remove);
router.post('/:id/duplicate', verifyCsrf, validate(mongoIdSchema, 'params'), duplicate);
export default router;
