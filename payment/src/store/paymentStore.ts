import { create } from "zustand";

type PaymentMethod = "stripe" | "paypal";

interface PaymentState {
    activeMethod: PaymentMethod;
    isProcessing: boolean;
    error: string | null;
    setMethod: (method: PaymentMethod) => void;
    setProcessing: (isProcessing: boolean) => void;
    setError: (error: string | null) => void;
}

export const usePaymentStore = create<PaymentState>((set) => ({
    activeMethod: "stripe",
    isProcessing: false,
    error: null,
    setMethod: (method) => set({ activeMethod: method, error: null }),
    setProcessing: (isProcessing) => set({ isProcessing }),
    setError: (error) => set({ error, isProcessing: false }),
}));
