import { connect } from 'mongoose';
import envConfig from './config/env.config.js';
import { createServer } from 'http';
import app from './app.js';
import leaveService from './services/leave.service.js';

const { port, mongo_uri } = envConfig;

// Leave expiry scheduler - runs every minute
function startLeaveExpiryScheduler() {
    const runExpiry = async () => {
        try {
            const expiredCount = await leaveService.expireStaleApplications();
            if (expiredCount > 0) {
                console.log(
                    `[Leave Scheduler] Expired ${expiredCount} pending leave applications`
                );
            }
        } catch (error) {
            console.error(
                '[Leave Scheduler] Error expiring applications:',
                error
            );
        }
    };

    // Run every minute
    setInterval(runExpiry, 60 * 1000);

    // Also run immediately on startup
    runExpiry();

    console.log(
        '[Leave Scheduler] Started - checking for expired applications every minute'
    );
}

async function Server() {
    try {
        await connect(mongo_uri);

        const server = createServer(app);

        server.listen(envConfig.port, () => {
            console.log(
                `Server is listening the port: http://localhost:${port}`
            );
        });

        console.log('Connected to database successfully.');

        // Start leave expiry scheduler
        startLeaveExpiryScheduler();
    } catch (error) {
        console.error('Database connection error:', error);
        process.exit(1);
    }
}

Server();
