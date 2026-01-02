import type { Request, Response } from 'express';
import PersonModel from '../models/Person.js';
import DebitModel, { DebitType } from '../models/Debit.js';

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

export const createDebit = async (req: Request, res: Response) => {
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

        const debit = await DebitModel.create({
            personId,
            amount,
            date: date || new Date(),
            type,
            description,
            createdBy: userId,
        });

        return res.status(201).json(debit);
    } catch (error) {
        console.error('Error creating debit:', error);
        return res
            .status(500)
            .json({ message: 'Failed to create debit', error });
    }
};

export const getDebits = async (req: Request, res: Response) => {
    try {
        const { personId } = req.query as { personId?: string };
        const filter = personId ? { personId } : {};

        const debits = await DebitModel.find(filter)
            .populate('personId', 'name')
            .sort({ date: -1 });

        return res.status(200).json(debits);
    } catch (error) {
        console.error('Error fetching debits:', error);
        return res
            .status(500)
            .json({ message: 'Failed to fetch debits', error });
    }
};

export const getDebitStats = async (_req: Request, res: Response) => {
    try {
        const stats = await DebitModel.aggregate([
            {
                $group: {
                    _id: '$personId',
                    totalBorrowed: {
                        $sum: {
                            $cond: [
                                { $eq: ['$type', DebitType.BORROW] },
                                '$amount',
                                0,
                            ],
                        },
                    },
                    totalReturned: {
                        $sum: {
                            $cond: [
                                { $eq: ['$type', DebitType.RETURN] },
                                '$amount',
                                0,
                            ],
                        },
                    },
                },
            },
            {
                $lookup: {
                    from: 'people',
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

export const updateDebit = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { amount, date, type, description } = req.body;

        const debit = await DebitModel.findByIdAndUpdate(
            id,
            { amount, date, type, description },
            { new: true }
        ).populate('personId', 'name');

        if (!debit) {
            return res.status(404).json({ message: 'Debit not found' });
        }

        return res.status(200).json(debit);
    } catch (error) {
        console.error('Error updating debit:', error);
        return res
            .status(500)
            .json({ message: 'Failed to update debit', error });
    }
};

export const deleteDebit = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const debit = await DebitModel.findByIdAndDelete(id);

        if (!debit) {
            return res.status(404).json({ message: 'Debit not found' });
        }

        return res.status(200).json({ message: 'Debit deleted successfully' });
    } catch (error) {
        console.error('Error deleting debit:', error);
        return res
            .status(500)
            .json({ message: 'Failed to delete debit', error });
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

        // Delete all debits for this person first
        await DebitModel.deleteMany({ personId: id } as any);

        const person = await PersonModel.findByIdAndDelete(id);

        if (!person) {
            return res.status(404).json({ message: 'Person not found' });
        }

        return res.status(200).json({
            message: 'Person and their debits deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting person:', error);
        return res
            .status(500)
            .json({ message: 'Failed to delete person', error });
    }
};

// Legacy aliases for backward compatibility
export const createTransaction = createDebit;
export const getTransactions = getDebits;
export const updateTransaction = updateDebit;
export const deleteTransaction = deleteDebit;
