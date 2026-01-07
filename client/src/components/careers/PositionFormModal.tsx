'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    useCreatePositionMutation,
    useUpdatePositionMutation,
} from '@/redux/features/career/careerApi';
import type { IJobPosition, CreateJobPositionInput } from '@/types/career.type';
import { toast } from 'sonner';

interface PositionFormModalProps {
    position: IJobPosition | null;
    onClose: () => void;
}

export function PositionFormModal({ position, onClose }: PositionFormModalProps) {
    const isEditing = !!position;

    const [createPosition, { isLoading: isCreating }] = useCreatePositionMutation();
    const [updatePosition, { isLoading: isUpdating }] = useUpdatePositionMutation();

    const isLoading = isCreating || isUpdating;

    const [formData, setFormData] = useState<CreateJobPositionInput>({
        title: '',
        company: 'Web Briks LLC',
        location: 'Mirpur-10, Dhaka',
        vacancies: 1,
        officeTime: 'N/A',
        jobType: 'Work at office',
        salary: 'Negotiable',
        deadline: '',
        companyHistory: '',
        description: '',
        responsibilities: [''],
        requirements: [''],
        benefits: [''],
        shift: '',
        gender: '',
        isOpened: true,
    });

    useEffect(() => {
        if (position) {
            setFormData({
                slug: position.slug,
                title: position.title,
                company: position.company,
                location: position.location,
                vacancies: position.vacancies,
                officeTime: position.officeTime,
                jobType: position.jobType,
                salary: position.salary,
                deadline: position.deadline.split('T')[0],
                companyHistory: position.companyHistory,
                description: position.description,
                responsibilities: position.responsibilities.length > 0 ? position.responsibilities : [''],
                requirements: position.requirements.length > 0 ? position.requirements : [''],
                benefits: position.benefits.length > 0 ? position.benefits : [''],
                shift: position.shift || '',
                gender: position.gender || '',
                isOpened: position.isOpened,
            });
        }
    }, [position]);

    const handleChange = (field: keyof CreateJobPositionInput, value: unknown) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleArrayChange = (field: 'responsibilities' | 'requirements' | 'benefits', index: number, value: string) => {
        const arr = [...(formData[field] || [])];
        arr[index] = value;
        handleChange(field, arr);
    };

    const addArrayItem = (field: 'responsibilities' | 'requirements' | 'benefits') => {
        handleChange(field, [...(formData[field] || []), '']);
    };

    const removeArrayItem = (field: 'responsibilities' | 'requirements' | 'benefits', index: number) => {
        const arr = [...(formData[field] || [])];
        arr.splice(index, 1);
        handleChange(field, arr.length > 0 ? arr : ['']);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Filter out empty strings from arrays
        const cleanData = {
            ...formData,
            responsibilities: formData.responsibilities?.filter(Boolean) || [],
            requirements: formData.requirements?.filter(Boolean) || [],
            benefits: formData.benefits?.filter(Boolean) || [],
        };

        try {
            if (isEditing && position) {
                await updatePosition({ id: position._id, ...cleanData }).unwrap();
                toast.success('Position updated successfully');
            } else {
                await createPosition(cleanData).unwrap();
                toast.success('Position created successfully');
            }
            onClose();
        } catch {
            toast.error(isEditing ? 'Failed to update position' : 'Failed to create position');
        }
    };

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? 'Edit Job Position' : 'Create New Job Position'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Job Title *</Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) => handleChange('title', e.target.value)}
                                required
                                placeholder="e.g. Full Stack Developer"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="company">Company *</Label>
                            <Input
                                id="company"
                                value={formData.company}
                                onChange={(e) => handleChange('company', e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="location">Location *</Label>
                            <Input
                                id="location"
                                value={formData.location}
                                onChange={(e) => handleChange('location', e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="deadline">Deadline *</Label>
                            <Input
                                id="deadline"
                                type="date"
                                value={formData.deadline}
                                onChange={(e) => handleChange('deadline', e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="vacancies">Vacancies</Label>
                            <Input
                                id="vacancies"
                                type="number"
                                min="1"
                                value={formData.vacancies}
                                onChange={(e) => handleChange('vacancies', parseInt(e.target.value) || 1)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="jobType">Job Type</Label>
                            <Input
                                id="jobType"
                                value={formData.jobType}
                                onChange={(e) => handleChange('jobType', e.target.value)}
                                placeholder="e.g. Work at office"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="salary">Salary</Label>
                            <Input
                                id="salary"
                                value={formData.salary}
                                onChange={(e) => handleChange('salary', e.target.value)}
                                placeholder="e.g. Negotiable"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="officeTime">Office Time</Label>
                            <Input
                                id="officeTime"
                                value={formData.officeTime}
                                onChange={(e) => handleChange('officeTime', e.target.value)}
                                placeholder="e.g. 10:00 AM - 7:00 PM"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="shift">Shift (Optional)</Label>
                            <Input
                                id="shift"
                                value={formData.shift}
                                onChange={(e) => handleChange('shift', e.target.value)}
                                placeholder="e.g. Evening & Night Shift"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="gender">Target Gender (Optional)</Label>
                            <Input
                                id="gender"
                                value={formData.gender}
                                onChange={(e) => handleChange('gender', e.target.value)}
                                placeholder="e.g. Female"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Job Description *</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            required
                            rows={4}
                            placeholder="Describe the job role and what you're looking for..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="companyHistory">Company Description</Label>
                        <Textarea
                            id="companyHistory"
                            value={formData.companyHistory}
                            onChange={(e) => handleChange('companyHistory', e.target.value)}
                            rows={3}
                            placeholder="Brief history or description of the company..."
                        />
                    </div>

                    {/* Responsibilities */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label>Responsibilities</Label>
                            <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem('responsibilities')}>
                                <Plus className="h-3 w-3 mr-1" /> Add
                            </Button>
                        </div>
                        {formData.responsibilities?.map((item, index) => (
                            <div key={index} className="flex gap-2">
                                <Input
                                    value={item}
                                    onChange={(e) => handleArrayChange('responsibilities', index, e.target.value)}
                                    placeholder="Enter responsibility..."
                                />
                                {(formData.responsibilities?.length || 0) > 1 && (
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeArrayItem('responsibilities', index)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Requirements */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label>Requirements</Label>
                            <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem('requirements')}>
                                <Plus className="h-3 w-3 mr-1" /> Add
                            </Button>
                        </div>
                        {formData.requirements?.map((item, index) => (
                            <div key={index} className="flex gap-2">
                                <Input
                                    value={item}
                                    onChange={(e) => handleArrayChange('requirements', index, e.target.value)}
                                    placeholder="Enter requirement..."
                                />
                                {(formData.requirements?.length || 0) > 1 && (
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeArrayItem('requirements', index)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Benefits */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label>Benefits</Label>
                            <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem('benefits')}>
                                <Plus className="h-3 w-3 mr-1" /> Add
                            </Button>
                        </div>
                        {formData.benefits?.map((item, index) => (
                            <div key={index} className="flex gap-2">
                                <Input
                                    value={item}
                                    onChange={(e) => handleArrayChange('benefits', index, e.target.value)}
                                    placeholder="Enter benefit..."
                                />
                                {(formData.benefits?.length || 0) > 1 && (
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeArrayItem('benefits', index)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Status Toggle */}
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div>
                            <Label htmlFor="isOpened" className="text-base font-medium">Position Status</Label>
                            <p className="text-sm text-muted-foreground">
                                {formData.isOpened ? 'Position is open for applications' : 'Position is closed'}
                            </p>
                        </div>
                        <Switch
                            id="isOpened"
                            checked={formData.isOpened}
                            onCheckedChange={(checked) => handleChange('isOpened', checked)}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {isEditing ? 'Update Position' : 'Create Position'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
