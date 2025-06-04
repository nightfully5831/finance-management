import express from 'express'
import dotenv from "dotenv";
import path from 'path'
import cors from 'cors'
import { connectMongoDB } from './config/dbConnection'
import { corsConfig } from './config/cors'
import { createServer } from 'node:http'
import webhookRouter from './routes/webhooks';
import routes from './routes'
import './trialReminder'

dotenv.config();
const app = express()
const server = createServer(app)

connectMongoDB()

const PORT = process.env.PORT || 5000

const clientBuildPath = path.join(__dirname, '../client/build');
app.use(express.static(clientBuildPath));

app.use('/webhook', express.raw({ type: 'application/json' }), webhookRouter)

app.use(cors(corsConfig))

app.use('/api', express.json({ limit: '50mb' }), routes)

app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

server.listen(PORT, async () => {
  console.log(`[⚡️ server]: Server running on port ${PORT}`)
})

export default server
