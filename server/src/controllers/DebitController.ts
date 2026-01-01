import type { Request, Response } from 'express';
import PersonModel from '../models/Person.js';
import TransactionModel, { TransactionType } from '../models/Transaction.js';

export const createPerson = async (req: Request, res: Response) => {
    try {
        const { name, phone, address, description } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (!name) {
            return res.status(400).json({ message: 'Name is required' });
        }

        const person = await PersonModel.create({
            name,
            phone,
            address,
            description,
            createdBy: userId,
        });

        return res.status(201).json(person);
    } catch (error) {
        console.error('Error creating person:', error);
        return res
            .status(500)
            .json({ message: 'Failed to create person', error });
    }
};

export const getPersons = async (_req: Request, res: Response) => {
    try {
        const persons = await PersonModel.find().sort({ createdAt: -1 });
        return res.status(200).json(persons);
    } catch (error) {
        console.error('Error fetching persons:', error);
        return res
            .status(500)
            .json({ message: 'Failed to fetch persons', error });
    }
};

export const createTransaction = async (req: Request, res: Response) => {
    try {
        const { personId, amount, date, type, description } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (!personId || !amount || !type) {
            return res
                .status(400)
                .json({ message: 'Person, amount, and type are required' });
        }

        const person = await PersonModel.findById(personId);
        if (!person) {
            return res.status(404).json({ message: 'Person not found' });
        }

        const transaction = await TransactionModel.create({
            personId,
            amount,
            date: date || new Date(),
            type,
            description,
            createdBy: userId,
        });

        return res.status(201).json(transaction);
    } catch (error) {
        console.error('Error creating transaction:', error);
        return res
            .status(500)
            .json({ message: 'Failed to create transaction', error });
    }
};

export const getTransactions = async (req: Request, res: Response) => {
    try {
        const { personId } = req.query as { personId?: string };
        const filter = personId ? { personId } : {};

        const transactions = await TransactionModel.find(filter)
            .populate('personId', 'name')
            .sort({ date: -1 });

        return res.status(200).json(transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return res
            .status(500)
            .json({ message: 'Failed to fetch transactions', error });
    }
};

export const getDebitStats = async (_req: Request, res: Response) => {
    try {
        const stats = await TransactionModel.aggregate([
            {
                $group: {
                    _id: '$personId',
                    totalBorrowed: {
                        $sum: {
                            $cond: [
                                { $eq: ['$type', TransactionType.BORROW] },
                                '$amount',
                                0,
                            ],
                        },
                    },
                    totalReturned: {
                        $sum: {
                            $cond: [
                                { $eq: ['$type', TransactionType.RETURN] },
                                '$amount',
                                0,
                            ],
                        },
                    },
                },
            },
            {
                $lookup: {
                    from: 'people', // Ensure collection name matches Mongoose default (pluralized 'Person' -> 'people')
                    localField: '_id',
                    foreignField: '_id',
                    as: 'person',
                },
            },
            {
                $unwind: '$person',
            },
            {
                $project: {
                    _id: 1,
                    name: '$person.name',
                    totalBorrowed: 1,
                    totalReturned: 1,
                    netBalance: {
                        $subtract: ['$totalBorrowed', '$totalReturned'],
                    },
                },
            },
        ]);

        return res.status(200).json(stats);
    } catch (error) {
        console.error('Error fetching stats:', error);
        return res
            .status(500)
            .json({ message: 'Failed to fetch debit stats', error });
    }
};

export const updateTransaction = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { amount, date, type, description } = req.body;

        const transaction = await TransactionModel.findByIdAndUpdate(
            id,
            { amount, date, type, description },
            { new: true }
        ).populate('personId', 'name');

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        return res.status(200).json(transaction);
    } catch (error) {
        console.error('Error updating transaction:', error);
        return res
            .status(500)
            .json({ message: 'Failed to update transaction', error });
    }
};

export const deleteTransaction = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const transaction = await TransactionModel.findByIdAndDelete(id);

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        return res
            .status(200)
            .json({ message: 'Transaction deleted successfully' });
    } catch (error) {
        console.error('Error deleting transaction:', error);
        return res
            .status(500)
            .json({ message: 'Failed to delete transaction', error });
    }
};

export const updatePerson = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, phone, address, description } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Name is required' });
        }

        const person = await PersonModel.findByIdAndUpdate(
            id,
            { name, phone, address, description },
            { new: true }
        );

        if (!person) {
            return res.status(404).json({ message: 'Person not found' });
        }

        return res.status(200).json(person);
    } catch (error) {
        console.error('Error updating person:', error);
        return res
            .status(500)
            .json({ message: 'Failed to update person', error });
    }
};

export const deletePerson = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Delete all transactions for this person first
        await TransactionModel.deleteMany({ personId: id } as any);

        const person = await PersonModel.findByIdAndDelete(id);

        if (!person) {
            return res.status(404).json({ message: 'Person not found' });
        }

        return res.status(200).json({
            message: 'Person and their transactions deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting person:', error);
        return res
            .status(500)
            .json({ message: 'Failed to delete person', error });
    }
};
