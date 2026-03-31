import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import routes from './routes.js';
import { setupSocketHandlers } from './socket-handlers.js';

const PORT = parseInt(process.env.PORT || '3000', 10);

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', routes);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

setupSocketHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
