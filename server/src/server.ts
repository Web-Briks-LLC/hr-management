import { connect } from 'mongoose';
import envConfig from './config/env.config.js';
import { createServer } from 'http';
import app from './app.js';
import schedulerService from './services/scheduler.service.js';

const { port, mongo_uri } = envConfig;

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

        // Start all schedulers (attendance, overtime, leave)
        schedulerService.startAllSchedulers();
    } catch (error) {
        console.error('Database connection error:', error);
        process.exit(1);
    }
}

Server();
