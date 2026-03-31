import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';
import routes from './routes.js';
import { setupSocketHandlers } from './socket-handlers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3000', 10);

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', routes);

// Serve frontend static files in production
const clientDist = join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (_req, res, next) => {
  if (_req.path.startsWith('/api') || _req.path.startsWith('/socket.io')) {
    return next();
  }
  res.sendFile(join(clientDist, 'index.html'));
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

setupSocketHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
