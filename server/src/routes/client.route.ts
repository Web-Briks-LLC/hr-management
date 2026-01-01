import { Router } from 'express';
import ClientController from '../controllers/client.controller.js';
import { authorize } from '../middlewares/authorize.js';
import { Role } from '../consonants/role.js';

const router: Router = Router();

const allowedRoles = [Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER];

// Get all clients
router.get('/', authorize(...allowedRoles), ClientController.getAllClients);

// Check client ID availability (must be before :id route)
router.get(
    '/check-id/:clientId',
    authorize(...allowedRoles),
    ClientController.checkClientId
);

// Get client stats (must be before :id route)
router.get(
    '/:id/stats',
    authorize(...allowedRoles),
    ClientController.getClientStats
);

// Get client by ID
router.get('/:id', authorize(...allowedRoles), ClientController.getClientById);

// Create client
router.post('/', authorize(...allowedRoles), ClientController.createClient);

// Update client
router.patch('/:id', authorize(...allowedRoles), ClientController.updateClient);

// Delete client
router.delete(
    '/:id',
    authorize(...allowedRoles),
    ClientController.deleteClient
);

export const clientRoute = router;
