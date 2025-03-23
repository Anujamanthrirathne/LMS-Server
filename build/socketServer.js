"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocketServer = void 0;
const socket_io_1 = require("socket.io");
const initSocketServer = (server) => {
    const io = new socket_io_1.Server(server, {
        cors: {
            origin: ['https://e-learning-client-rho.vercel.app'], // Allowed origins
            methods: ['GET', 'POST'],
            credentials: true,
        },
        transports: ['websocket'],
        pingInterval: 10000, // Keep alive interval
        pingTimeout: 5000, // Timeout for pings
    });
    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}`);
        // Listen for the 'Notification' event from clients
        socket.on('Notification', (data) => {
            console.log('New notification received:', data);
            // Emit the notification to all clients
            io.emit('newNotification', data);
        });
        // Disconnection event
        socket.on('disconnect', (reason) => {
            console.log(`User disconnected: ${reason}`);
        });
        // Error handling
        socket.on('error', (err) => {
            console.error(`Socket error: ${err}`);
        });
    });
    console.log('Socket.IO server initialized');
};
exports.initSocketServer = initSocketServer;
