import type { ClientSession, Types } from 'mongoose';
import StaffModel from '../models/staff.model.js';
import ProductionWorkSessionModel from '../models/production-session.model.js';
import { employmentEnd, isEmployedOn } from '../utils/employment.util.js';
import type { Employment } from '../utils/employment.util.js';

/** Backdate the hold to the cutoff, even when the scheduler runs after midnight. */
export async function freezeInactiveWorkSessions(
    person?: Employment & { _id: Types.ObjectId }, session?: ClientSession,
) {
    const active = await ProductionWorkSessionModel.find({
        status: 'active', ...(person ? { staffId: person._id } : {}),
    }).session(session || null).lean();
    const people = person ? [person] : await StaffModel.find({
        _id: { $in: active.map(s => s.staffId) },
    }).session(session || null).lean();
    const byId = new Map(people.map(p => [String(p._id), p]));
    const now = new Date();
    for (const work of active) {
        const staff = byId.get(String(work.staffId));
        if (!staff) continue;
        const stop = isEmployedOn(staff, work.startTime)
            ? employmentEnd(staff, work.startTime, now) : work.startTime;
        if (stop >= now) continue;
        await ProductionWorkSessionModel.updateOne({ _id: work._id, status: 'active' }, {
            $set: { status: 'paused', pausedAt: stop },
            $push: { pauseHistory: { pausedAt: stop, resumedAt: null, byUserId: null } },
        }, { ...(session ? { session } : {}) });
    }
}
