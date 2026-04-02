import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: SocketIOServer;

// Map of userId to array of socketIds
const userSockets = new Map<string, string[]>();

export const initSocket = (server: HttpServer) => {
    io = new SocketIOServer(server, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:3000',
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        socket.on('authenticate', (userId: string) => {
            if (userId) {
                socket.data.userId = userId;
                const existingSockets = userSockets.get(userId) || [];
                userSockets.set(userId, [...existingSockets, socket.id]);
                console.log(`User ${userId} authenticated on socket ${socket.id}`);
            }
        });

        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}`);
            const userId = socket.data.userId;
            if (userId) {
                const existingSockets = userSockets.get(userId) || [];
                const updatedSockets = existingSockets.filter((id) => id !== socket.id);
                if (updatedSockets.length > 0) {
                    userSockets.set(userId, updatedSockets);
                } else {
                    userSockets.delete(userId);
                }
            }
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

export const getUserSockets = (userId: string): string[] => {
    return userSockets.get(userId) || [];
};

export const emitToUser = (userId: string, event: string, data: any) => {
    if (!io) return;
    const sockets = userSockets.get(userId);
    if (sockets && sockets.length > 0) {
        sockets.forEach((socketId) => {
            io.to(socketId).emit(event, data);
        });
    }
};

export const broadcastPolicyPrompt = (targetUserIds: string[], policyData: any) => {
    targetUserIds.forEach((userId) => {
        emitToUser(userId, 'policy:prompt', policyData);
    });
};
