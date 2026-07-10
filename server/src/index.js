import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import leadsRouter from './routes/leads.js';
import sitesRouter from './routes/sites.js';
import rebuildRouter from './routes/rebuild.js';
import socialRouter from './routes/social.js';
import chatRouter from './routes/chat.js';
import appointmentsRouter from './routes/appointments.js';
import chatbotPitchRouter from './routes/chatbotPitch.js';
import coldEmailRouter from './routes/coldEmail.js';
import meetingsRouter from './routes/meetings.js';
import receptionistRouter from './routes/receptionist.js';
import statsRouter from './routes/stats.js';
import authRouter from './routes/auth.js';
import { requireAuth } from './middleware/auth.js';
import { getSiteById } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api', authRouter);          // login — no auth required

// Public routes — called from demo sites shown to potential clients (no login token available)
app.use('/api', chatRouter);
app.use('/api', appointmentsRouter);
app.use('/api', receptionistRouter); // /api/vapi/* webhooks must be public (called by Vapi servers)

app.use('/api', requireAuth);         // everything below requires a valid token
app.use('/api', leadsRouter);
app.use('/api', sitesRouter);
app.use('/api', rebuildRouter);
app.use('/api', socialRouter);
app.use('/api', chatbotPitchRouter);
app.use('/api', coldEmailRouter);
app.use('/api', meetingsRouter);
app.use('/api', receptionistRouter); // authenticated receptionist management routes
app.use('/api', statsRouter);

// Shareable demo-site link (Section 4: "Get shareable link" for Demo mode).
// Plain HTML, not JSON — meant to be opened directly in a browser or texted.
app.get('/preview/:id', (req, res) => {
  const site = getSiteById(req.params.id);
  if (!site) return res.status(404).send('<h1>Demo site not found</h1>');
  res.set('Content-Type', 'text/html');
  res.send(site.html_content);
});

// Serve the built React app (production only — dev uses Vite on port 5173)
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));

// Catch-all: any non-API, non-preview route serves the React index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`LeadSavior.ai server running on http://localhost:${PORT}`);
});
