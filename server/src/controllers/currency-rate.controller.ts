import type { Request, Response } from 'express';
import currencyRateService from '../services/currency-rate.service.js';

async function getRatesForMonth(req: Request, res: Response) {
    try {
        const month = parseInt(req.params.month || '');
        const year = parseInt(req.params.year || '');

        if (!month || !year || month < 1 || month > 12) {
            return res.status(400).json({
                message: 'Valid month (1-12) and year are required',
            });
        }

        const userId = req.user?.id;
        const rates = await currencyRateService.getOrCreateRatesForMonth(
            month,
            year,
            userId
        );

        return res.status(200).json({
            message: 'Currency rates fetched successfully',
            data: rates,
        });
    } catch (error) {
        console.error('Error fetching currency rates:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function updateRatesForMonth(req: Request, res: Response) {
    try {
        const month = parseInt(req.params.month || '');
        const year = parseInt(req.params.year || '');
        const { rates } = req.body;
        const userId = req.user?.id;

        if (!month || !year || month < 1 || month > 12) {
            return res.status(400).json({
                message: 'Valid month (1-12) and year are required',
            });
        }

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (!rates || !Array.isArray(rates)) {
            return res.status(400).json({
                message: 'Rates array is required',
            });
        }

        // Validate each rate
        for (const rate of rates) {
            if (!rate.currency || typeof rate.rate !== 'number' || rate.rate < 0) {
                return res.status(400).json({
                    message: 'Each rate must have a currency and valid rate number',
                });
            }
        }

        const updated = await currencyRateService.updateRatesForMonth(
            month,
            year,
            rates,
            userId
        );

        return res.status(200).json({
            message: 'Currency rates updated successfully',
            data: updated,
        });
    } catch (error) {
        console.error('Error updating currency rates:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export { getRatesForMonth, updateRatesForMonth };
