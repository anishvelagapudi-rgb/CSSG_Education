import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import exampleRouter from './routes/example.js';

const app = express();
const PORT = process.env.PORT || 3000;

// CORS: comma-separated list of allowed frontend origins
// e.g. CORS_ORIGIN=http://localhost:5173,https://my-app.vercel.app
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Health check (Render uses this to know the server is up)
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// Routes
app.use('/api/example', exampleRouter);

// 404 for anything else
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
