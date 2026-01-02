import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

interface Person {
    _id: string;
    name: string;
    phone?: string;
    address?: string;
    description?: string;
    createdAt: string;
}

interface Debit {
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
    debits: Debit[];
    stats: DebitStats[];
    loading: boolean;
    error: string | null;
}

const initialState: DebitState = {
    persons: [],
    debits: [],
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

export const fetchDebits = createAsyncThunk(
    'debit/fetchDebits',
    async (personId: string | undefined, { rejectWithValue }) => {
        try {
            const url = personId
                ? `${BASE_URL}/debits/debits?personId=${personId}`
                : `${BASE_URL}/debits/debits`;
            const response = await fetch(url, {
                credentials: 'include',
            });
            if (!response.ok) throw new Error('Failed to fetch debits');
            return await response.json();
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const createDebit = createAsyncThunk(
    'debit/createDebit',
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
            const response = await fetch(`${BASE_URL}/debits/debits`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) throw new Error('Failed to create debit');
            return await response.json();
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const updateDebit = createAsyncThunk(
    'debit/updateDebit',
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
            const response = await fetch(`${BASE_URL}/debits/debits/${id}`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(rest),
            });
            if (!response.ok) throw new Error('Failed to update debit');
            return await response.json();
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const deleteDebit = createAsyncThunk(
    'debit/deleteDebit',
    async (id: string, { rejectWithValue }) => {
        try {
            const response = await fetch(`${BASE_URL}/debits/debits/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (!response.ok) throw new Error('Failed to delete debit');
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
                state.debits = state.debits.filter(
                    (t) => t.personId._id !== action.payload
                );
            })
            // Fetch Debits
            .addCase(fetchDebits.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchDebits.fulfilled, (state, action) => {
                state.loading = false;
                state.debits = action.payload;
            })
            .addCase(fetchDebits.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // Create Debit
            .addCase(createDebit.fulfilled, (state, action) => {
                state.debits.unshift(action.payload);
            })
            // Update Debit
            .addCase(updateDebit.fulfilled, (state, action) => {
                const index = state.debits.findIndex(
                    (t) => t._id === action.payload._id
                );
                if (index !== -1) {
                    state.debits[index] = action.payload;
                }
            })
            // Delete Debit
            .addCase(deleteDebit.fulfilled, (state, action) => {
                state.debits = state.debits.filter(
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
