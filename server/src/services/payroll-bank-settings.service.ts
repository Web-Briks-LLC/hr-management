import { PayrollBankSettingsModel } from '../models/payroll-bank-settings.model.js';
import type { IPayrollBankSettings } from '../models/payroll-bank-settings.model.js';

// Get all bank settings
async function getAllBankSettings() {
    const settings = await PayrollBankSettingsModel.find().sort({
        isDefault: -1,
        createdAt: -1,
    });
    return settings;
}

// Get bank setting by ID
async function getBankSettingById(id: string) {
    const setting = await PayrollBankSettingsModel.findById(id);
    return setting;
}

// Create bank setting
async function createBankSetting(data: Partial<IPayrollBankSettings>) {
    const setting = await PayrollBankSettingsModel.create(data);
    return setting;
}

// Update bank setting
async function updateBankSetting(
    id: string,
    data: Partial<IPayrollBankSettings>,
) {
    // If setting as default, unset other defaults first
    if (data.isDefault) {
        await PayrollBankSettingsModel.updateMany(
            { _id: { $ne: id } },
            { isDefault: false },
        );
    }

    const setting = await PayrollBankSettingsModel.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true,
    });
    return setting;
}

// Delete bank setting
async function deleteBankSetting(id: string) {
    const setting = await PayrollBankSettingsModel.findByIdAndDelete(id);
    return setting;
}

// Get default bank setting
async function getDefaultBankSetting() {
    const setting = await PayrollBankSettingsModel.findOne({ isDefault: true });
    return setting;
}

export const PayrollBankSettingsService = {
    getAllBankSettings,
    getBankSettingById,
    createBankSetting,
    updateBankSetting,
    deleteBankSetting,
    getDefaultBankSetting,
};
