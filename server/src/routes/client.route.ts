import { Router } from 'express';
import ClientController from '../controllers/client.controller.js';
import { authorizeTelemarketer } from '../middlewares/authorizeTelemarketer.js';

const router: Router = Router();

// Get all clients
router.get('/', authorizeTelemarketer, ClientController.getAllClients);

// Check client ID availability (must be before :id route)
router.get(
    '/check-id/:clientId',
    authorizeTelemarketer,
    ClientController.checkClientId,
);

// Get client stats (must be before :id route)
router.get(
    '/:id/stats',
    authorizeTelemarketer,
    ClientController.getClientStats,
);

// Get client by ID
router.get('/:id', authorizeTelemarketer, ClientController.getClientById);

// Create client
router.post('/', authorizeTelemarketer, ClientController.createClient);

// Update client
router.patch('/:id', authorizeTelemarketer, ClientController.updateClient);

// Get assigned services for a client
router.get(
    '/:id/assigned-services',
    authorizeTelemarketer,
    ClientController.getAssignedServices,
);

// Get all emails (client + team) for a client
router.get('/:id/emails', authorizeTelemarketer, ClientController.getClientEmails);

export const clientRoute = router;
