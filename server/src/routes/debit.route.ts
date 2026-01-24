import { Router } from 'express';
import {
    createPerson,
    getPersons,
    updatePerson,
    deletePerson,
    createDebit,
    getDebits,
    updateDebit,
    deleteDebit,
    getDebitStats,
} from '../controllers/debit.controller.js';

export const debitRoute = Router();

// Persons
debitRoute.post('/persons', createPerson);
debitRoute.get('/persons', getPersons);
debitRoute.put('/persons/:id', updatePerson);
debitRoute.delete('/persons/:id', deletePerson);

// Debits
debitRoute.post('/debits', createDebit);
debitRoute.get('/debits', getDebits);
debitRoute.put('/debits/:id', updateDebit);
debitRoute.delete('/debits/:id', deleteDebit);

// Stats
debitRoute.get('/stats', getDebitStats);
