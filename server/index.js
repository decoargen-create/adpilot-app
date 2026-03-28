import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initializeDatabase } from './db.js';
import authRoutes from './routes/auth.js';
import campaignsRoutes from './routes/campaigns.js';
import uploadsRoutes from './routes/uploads.js';
import integrationsRoutes from './routes/integrations.js';
import metaApiRoutes from './routes/meta-api.js';
import productsRoutes from './routes/products.js';
import settingsRoutes from './routes/settings.js';
import autoPublishRoutes from './routes/auto-publish.js';
import libraryRoutes from './routes/library.js';

// Cargar .env desde la raiz del proyecto (un nivel arriba del server/)
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });
// Fallback: tambien intentar .env local del server
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Set environment variable for auth middleware
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = JWT_SECRET;
}

// Initialize database
initializeDatabase().then(() => {
  console.log('Database initialized');
}).catch(err => {
  console.error('Error initializing database:', err);
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve static files from built frontend (production mode)
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/meta', metaApiRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/auto-publish', autoPublishRoutes);
app.use('/api/library', libraryRoutes);

// Privacy Policy page (required by Meta for app review)
app.get('/privacy', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>AdPilot - Politica de Privacidad</title>
<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#333;line-height:1.6}h1{color:#6d28d9}h2{color:#4f46e5;margin-top:30px}</style>
</head>
<body>
<h1>Politica de Privacidad - AdPilot</h1>
<p><strong>Ultima actualizacion:</strong> 25 de marzo de 2026</p>
<h2>1. Informacion que recopilamos</h2>
<p>AdPilot recopila la informacion minima necesaria para funcionar: nombre, email y token de acceso de Meta Ads para gestionar campanas publicitarias en tu nombre.</p>
<h2>2. Uso de la informacion</h2>
<p>Utilizamos tu informacion exclusivamente para: autenticarte via Facebook OAuth, gestionar tus campanas publicitarias en Meta Ads, y duplicar/publicar campanas segun tus instrucciones.</p>
<h2>3. Almacenamiento</h2>
<p>Los tokens de acceso se almacenan de forma segura en nuestra base de datos local. No compartimos tu informacion con terceros.</p>
<h2>4. Eliminacion de datos</h2>
<p>Puedes solicitar la eliminacion de todos tus datos en cualquier momento contactandonos a mrluks95@gmail.com.</p>
<h2>5. Contacto</h2>
<p>Para consultas sobre privacidad, contacta a: mrluks95@gmail.com</p>
</body></html>`);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// SPA catch-all route (must be after all other routes)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`AdPilot backend running on port ${PORT}`);
});
