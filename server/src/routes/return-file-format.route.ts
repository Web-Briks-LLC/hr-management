import { Router } from 'express';
import {
    createReturnFileFormat,
    getAllReturnFileFormats,
    getReturnFileFormatById,
    updateReturnFileFormat,
    deleteReturnFileFormat,
} from '../controllers/return-file-format.controller.js';

const router = Router();

router.post('/', createReturnFileFormat);
router.get('/', getAllReturnFileFormats);
router.get('/:id', getReturnFileFormatById);
router.patch('/:id', updateReturnFileFormat);
router.delete('/:id', deleteReturnFileFormat);

export { router as returnFileFormatRoute };
