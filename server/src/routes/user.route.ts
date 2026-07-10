import { Router } from 'express';
import UserControllers from '../controllers/user.controller.js';
import { upload } from '../middlewares/upload.middleware.js';

const router: Router = Router();

router.post(
    '/upload-image',
    upload.single('image'),
    UserControllers.uploadImage
);

export const userRoute = router;
