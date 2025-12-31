import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

interface Person {
    _id: string;
    name: string;
    phone?: string;
    address?: string;
    description?: string;
    createdAt: string;
}

interface Transaction {
    _id: string;
    personId: {
        _id: string;
        name: string;
    };
    amount: number;
    date: string;
    type: 'Borrow' | 'Return';
    description?: string;
    createdAt: string;
}

interface DebitStats {
    _id: string;
    name: string;
    totalBorrowed: number;
    totalReturned: number;
    netBalance: number;
}

interface DebitState {
    persons: Person[];
    transactions: Transaction[];
    stats: DebitStats[];
    loading: boolean;
    error: string | null;
}

const initialState: DebitState = {
    persons: [],
    transactions: [],
    stats: [],
    loading: false,
    error: null,
};

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const fetchPersons = createAsyncThunk(
    'debit/fetchPersons',
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetch(`${BASE_URL}/debits/persons`, {
                credentials: 'include',
            });
            if (!response.ok) throw new Error('Failed to fetch persons');
            return await response.json();
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const createPerson = createAsyncThunk(
    'debit/createPerson',
    async (
        data: {
            name: string;
            phone?: string;
            address?: string;
            description?: string;
        },
        { rejectWithValue }
    ) => {
        try {
            const response = await fetch(`${BASE_URL}/debits/persons`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) throw new Error('Failed to create person');
            return await response.json();
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const updatePerson = createAsyncThunk(
    'debit/updatePerson',
    async (
        data: {
            id: string;
            name: string;
            phone?: string;
            address?: string;
            description?: string;
        },
        { rejectWithValue }
    ) => {
        try {
            const { id, ...rest } = data;
            const response = await fetch(`${BASE_URL}/debits/persons/${id}`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(rest),
            });
            if (!response.ok) throw new Error('Failed to update person');
            return await response.json();
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const deletePerson = createAsyncThunk(
    'debit/deletePerson',
    async (id: string, { rejectWithValue }) => {
        try {
            const response = await fetch(`${BASE_URL}/debits/persons/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (!response.ok) throw new Error('Failed to delete person');
            return id;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchTransactions = createAsyncThunk(
    'debit/fetchTransactions',
    async (personId: string | undefined, { rejectWithValue }) => {
        try {
            const url = personId
                ? `${BASE_URL}/debits/transactions?personId=${personId}`
                : `${BASE_URL}/debits/transactions`;
            const response = await fetch(url, {
                credentials: 'include',
            });
            if (!response.ok) throw new Error('Failed to fetch transactions');
            return await response.json();
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const createTransaction = createAsyncThunk(
    'debit/createTransaction',
    async (
        data: {
            personId: string;
            amount: number;
            date?: string;
            type: 'Borrow' | 'Return';
            description?: string;
        },
        { rejectWithValue }
    ) => {
        try {
            const response = await fetch(`${BASE_URL}/debits/transactions`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) throw new Error('Failed to create transaction');
            return await response.json();
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const updateTransaction = createAsyncThunk(
    'debit/updateTransaction',
    async (
        data: {
            id: string;
            amount: number;
            date?: string;
            type: 'Borrow' | 'Return';
            description?: string;
        },
        { rejectWithValue }
    ) => {
        try {
            const { id, ...rest } = data;
            const response = await fetch(
                `${BASE_URL}/debits/transactions/${id}`,
                {
                    method: 'PUT',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(rest),
                }
            );
            if (!response.ok) throw new Error('Failed to update transaction');
            return await response.json();
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const deleteTransaction = createAsyncThunk(
    'debit/deleteTransaction',
    async (id: string, { rejectWithValue }) => {
        try {
            const response = await fetch(
                `${BASE_URL}/debits/transactions/${id}`,
                {
                    method: 'DELETE',
                    credentials: 'include',
                }
            );
            if (!response.ok) throw new Error('Failed to delete transaction');
            return id;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchDebitStats = createAsyncThunk(
    'debit/fetchDebitStats',
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetch(`${BASE_URL}/debits/stats`, {
                credentials: 'include',
            });
            if (!response.ok) throw new Error('Failed to fetch stats');
            return await response.json();
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

const debitSlice = createSlice({
    name: 'debit',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            // Fetch Persons
            .addCase(fetchPersons.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchPersons.fulfilled, (state, action) => {
                state.loading = false;
                state.persons = action.payload;
            })
            .addCase(fetchPersons.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // Create Person
            .addCase(createPerson.fulfilled, (state, action) => {
                state.persons.unshift(action.payload);
            })
            // Update Person
            .addCase(updatePerson.fulfilled, (state, action) => {
                const index = state.persons.findIndex(
                    (p) => p._id === action.payload._id
                );
                if (index !== -1) {
                    state.persons[index] = action.payload;
                }
            })
            // Delete Person
            .addCase(deletePerson.fulfilled, (state, action) => {
                state.persons = state.persons.filter(
                    (p) => p._id !== action.payload
                );
                state.transactions = state.transactions.filter(
                    (t) => t.personId._id !== action.payload
                );
            })
            // Fetch Transactions
            .addCase(fetchTransactions.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchTransactions.fulfilled, (state, action) => {
                state.loading = false;
                state.transactions = action.payload;
            })
            .addCase(fetchTransactions.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // Create Transaction
            .addCase(createTransaction.fulfilled, (state, action) => {
                state.transactions.unshift(action.payload);
            })
            // Update Transaction
            .addCase(updateTransaction.fulfilled, (state, action) => {
                const index = state.transactions.findIndex(
                    (t) => t._id === action.payload._id
                );
                if (index !== -1) {
                    state.transactions[index] = action.payload;
                }
            })
            // Delete Transaction
            .addCase(deleteTransaction.fulfilled, (state, action) => {
                state.transactions = state.transactions.filter(
                    (t) => t._id !== action.payload
                );
            })
            // Fetch Stats
            .addCase(fetchDebitStats.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchDebitStats.fulfilled, (state, action) => {
                state.loading = false;
                state.stats = action.payload;
            })
            .addCase(fetchDebitStats.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

export default debitSlice.reducer;
