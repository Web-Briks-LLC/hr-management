import { apiSlice } from '@/redux/api/apiSlice';

export interface PayrollBankSetting {
    _id: string;
    bankName: string;
    bankAccountNo: string;
    companyName: string;
    branchName?: string;
    branchLocation?: string;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

export const payrollBankSettingsApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getPayrollBankSettings: builder.query<
            { success: boolean; data: PayrollBankSetting[] },
            void
        >({
            query: () => ({
                url: '/payroll-bank-settings',
                method: 'GET',
            }),
            providesTags: ['PayrollBankSettings'],
        }),
        createPayrollBankSetting: builder.mutation<
            { success: boolean; data: PayrollBankSetting },
            Partial<PayrollBankSetting>
        >({
            query: (data) => ({
                url: '/payroll-bank-settings',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['PayrollBankSettings'],
        }),
        updatePayrollBankSetting: builder.mutation<
            { success: boolean; data: PayrollBankSetting },
            { id: string; data: Partial<PayrollBankSetting> }
        >({
            query: ({ id, data }) => ({
                url: `/payroll-bank-settings/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: ['PayrollBankSettings'],
        }),
        deletePayrollBankSetting: builder.mutation<
            { success: boolean },
            string
        >({
            query: (id) => ({
                url: `/payroll-bank-settings/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['PayrollBankSettings'],
        }),
    }),
});

export const {
    useGetPayrollBankSettingsQuery,
    useCreatePayrollBankSettingMutation,
    useUpdatePayrollBankSettingMutation,
    useDeletePayrollBankSettingMutation,
} = payrollBankSettingsApi;
