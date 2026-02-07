import type { Request, Response, NextFunction } from 'express';
import { PayrollBankSettingsService } from '../services/payroll-bank-settings.service.js';

// Get all bank settings
const getAllBankSettings = async (
    _req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const settings = await PayrollBankSettingsService.getAllBankSettings();
        res.status(200).json({
            success: true,
            data: settings,
        });
    } catch (error) {
        next(error);
    }
};

// Get bank setting by ID
const getBankSettingById = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const { id } = req.params;
        const setting = await PayrollBankSettingsService.getBankSettingById(
            id!,
        );

        if (!setting) {
            res.status(404).json({
                success: false,
                message: 'Bank setting not found',
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: setting,
        });
    } catch (error) {
        next(error);
    }
};

// Create bank setting
const createBankSetting = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const setting = await PayrollBankSettingsService.createBankSetting(
            req.body,
        );
        res.status(201).json({
            success: true,
            message: 'Bank setting created successfully',
            data: setting,
        });
    } catch (error) {
        next(error);
    }
};

// Update bank setting
const updateBankSetting = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const { id } = req.params;
        const setting = await PayrollBankSettingsService.updateBankSetting(
            id as string,
            req.body,
        );

        if (!setting) {
            res.status(404).json({
                success: false,
                message: 'Bank setting not found',
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: 'Bank setting updated successfully',
            data: setting,
        });
    } catch (error) {
        next(error);
    }
};

// Delete bank setting
const deleteBankSetting = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const { id } = req.params;
        const setting = await PayrollBankSettingsService.deleteBankSetting(id!);

        if (!setting) {
            res.status(404).json({
                success: false,
                message: 'Bank setting not found',
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: 'Bank setting deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};

export const PayrollBankSettingsController = {
    getAllBankSettings,
    getBankSettingById,
    createBankSetting,
    updateBankSetting,
    deleteBankSetting,
};
