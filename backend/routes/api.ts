import { Router } from 'express';
import PointController from '../controllers/PointController';

const router = Router();

router.get('/points', PointController.index);
router.get('/points/:id', PointController.show);
router.post('/points', PointController.store);
router.put('/points/:id', PointController.update);
router.delete('/points/:id', PointController.destroy);

export default router;
