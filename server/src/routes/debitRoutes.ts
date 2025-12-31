import { Router } from 'express';
import {
    createPerson,
    getPersons,
    updatePerson,
    deletePerson,
    createTransaction,
    getTransactions,
    updateTransaction,
    deleteTransaction,
    getDebitStats,
} from '../controllers/DebitController.js';

export const debitRoute = Router();

// Persons
debitRoute.post('/persons', createPerson);
debitRoute.get('/persons', getPersons);
debitRoute.put('/persons/:id', updatePerson);
debitRoute.delete('/persons/:id', deletePerson);

// Transactions
debitRoute.post('/transactions', createTransaction);
debitRoute.get('/transactions', getTransactions);
debitRoute.put('/transactions/:id', updateTransaction);
debitRoute.delete('/transactions/:id', deleteTransaction);

// Stats
debitRoute.get('/stats', getDebitStats);
