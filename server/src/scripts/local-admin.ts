/** Local-only admin setup. Credentials arrive on stdin, never in source/CLI args. */
import { hashPassword } from 'better-auth/crypto';
import { client } from '../lib/db.js';
import envConfig from '../config/env.config.js';

if (envConfig.db_name !== 'hr-management-local' ||
    !/^mongodb:\/\/(mongo|127\.0\.0\.1|localhost):27017\/hr-management-local(?:\?.*)?$/.test(envConfig.mongo_uri) ||
    process.env.NODE_ENV === 'production') {
    throw new Error('Admin setup is restricted to the local development database.');
}
let input = '';
for await (const chunk of process.stdin) input += chunk;
const { email, password } = JSON.parse(input);
if (typeof email !== 'string' || typeof password !== 'string' || password.length < 8) {
    throw new Error('Supply an email and a password of at least 8 characters.');
}
const { auth } = await import('../lib/auth.js');
const mongo = await client();
try {
    const db = mongo.db(envConfig.db_name);
    let user = await db.collection('user').findOne({ email });
    if (!user) {
        await auth.api.signUpEmail({ body: { name: 'Fuyad Hasan Fahim', email, password } });
        user = await db.collection('user').findOne({ email });
    }
    if (!user) throw new Error('Local user creation failed.');
    await db.collection('user').updateOne({ _id: user._id }, {
        $set: { role: 'super_admin', emailVerified: true, banned: false, updatedAt: new Date() },
        $unset: { banReason: '', banExpires: '' },
    });
    const userIds = [user._id, user._id.toString()];
    const account = await db.collection('account').findOne({
        userId: { $in: userIds }, providerId: 'credential',
    });
    const passwordHash = await hashPassword(password);
    if (account) {
        await db.collection('account').updateOne({ _id: account._id }, {
            $set: { password: passwordHash, updatedAt: new Date() },
        });
    } else {
        await db.collection('account').insertOne({
            userId: user._id, accountId: user._id.toString(), providerId: 'credential',
            password: passwordHash, createdAt: new Date(), updatedAt: new Date(),
        });
    }
    // Imported sessions must not become valid sessions on this local copy.
    await db.collection('session').deleteMany({});
    console.log('Local super admin is ready. Production accounts are unchanged.');
} finally {
    await mongo.close();
}
