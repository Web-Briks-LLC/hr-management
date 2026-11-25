import DepartmentModel from '../models/department.model.js';
import DesignationModel from '../models/designation.model.js';
import { escapeRegex } from '../lib/sanitize.js';

/** "Photo Editor" -> "photoeditor": ignores case, spaces, underscores and dashes. */
export const normalizeLabel = (value?: string | null) =>
    String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Matches "Photo Editor", "photo_editor", "PHOTO-EDITOR" and "photo  editor". */
export const looseLabelRegex = (value: string) => {
    const words = value
        .trim()
        .split(/[^A-Za-z0-9]+/)
        .filter(Boolean)
        .map(escapeRegex);
    return new RegExp(`^\\s*${words.join('[\\s_\\-./]*')}\\s*$`, 'i');
};

/**
 * Mongo condition for a staff department/designation filter. Staff records can
 * hold the title in any casing/format, or the short code (e.g. "PE", "TL").
 */
export async function staffLabelFilter(kind: 'department' | 'designation', value: string) {
    const clean = value.trim();
    if (!clean) return undefined;
    const options: RegExp[] = [looseLabelRegex(clean)];
    const doc: any =
        kind === 'department'
            ? await DepartmentModel.findOne({ name: looseLabelRegex(clean) }).select('code').lean()
            : await DesignationModel.findOne({ title: looseLabelRegex(clean) }).select('code').lean();
    if (doc?.code) options.push(new RegExp(`^\\s*${escapeRegex(doc.code)}\\s*$`, 'i'));
    return { $in: options };
}

/** Short codes people also store in the staff record. */
export const LABEL_ALIASES: Record<string, string> = {
    prod: 'production',
    tl: 'teamleader',
    pe: 'photoeditor',
    qa: 'qualityassurance',
};
export const canonicalLabel = (value?: string | null) => {
    const normalized = normalizeLabel(value);
    return LABEL_ALIASES[normalized] || normalized;
};
