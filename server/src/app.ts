import express, {
    type Application,
    type Response,
    type Request,
} from 'express';
import cors from 'cors';
import envConfig from './config/env.config.js';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth.js';
import { requireAuth } from './middlewares/auth.middleware.js';
import router from './routes/index.js';

const { trusted_origins } = envConfig;

const app: Application = express();

app.use(
    cors({
        origin: trusted_origins.split(','),
        credentials: true,
    })
);

app.all('/api/auth/{*any}', toNodeHandler(auth));

app.use(express.json());

app.use(
    '/api',
    (req: Request, res: Response, next: any) => {
        // Allow public access to invitation validation and acceptance
        const isPublicInvitationRoute =
            (req.method === 'GET' &&
                /^\/invitations\/[^/]+\/validate$/.test(req.path)) ||
            (req.method === 'POST' &&
                /^\/invitations\/[^/]+\/accept$/.test(req.path));

        // Allow public access to metadata type routes (for invite dialog dropdowns)
        const isPublicMetadataRoute =
            req.method === 'GET' &&
            /^\/metadata\/type\/(department|designation)$/.test(req.path);

        if (isPublicInvitationRoute || isPublicMetadataRoute) {
            return next();
        }

        return requireAuth(req, res, next);
    },
    router
);

app.get('/', (_req: Request, res: Response) => {
    res.send('Hello World!');
});

export default app;
