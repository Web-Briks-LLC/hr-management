import { Router } from 'express';
import {
    getRatesForMonth,
    updateRatesForMonth,
} from '../controllers/currency-rate.controller.js';
import { authorize } from '../middlewares/authorize.js';

const currencyRateRoute: Router = Router();

// Get rates for a specific month/year (any authenticated user)
currencyRateRoute.get('/:month/:year', getRatesForMonth);

// Update rates for a specific month/year (super_admin only)
currencyRateRoute.put(
    '/:month/:year',
    authorize('super_admin'),
    updateRatesForMonth
);

export { currencyRateRoute };
