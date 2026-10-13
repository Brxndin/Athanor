import cors from 'cors';
import * as dotenv from 'dotenv';
import express, { Application } from 'express';
import helmet from 'helmet';

dotenv.config({ path: `./../.env` });

import { ChatController } from './controllers/ChatController';
import { TagsController } from './controllers/TagsController';
import { OllamaService } from './services/OllamaService';

export class Server {
    private app: Application;

    constructor() {
        this.app = express();
        this.app.use(helmet());
        this.app.use(cors());

        // Limite para JSON grande
        this.app.use(express.json({ limit: '50mb' }));
    }

    public setupRoutes() {
        const ollamaService = new OllamaService();

        const tagsController = new TagsController(ollamaService);
        const chatController = new ChatController(ollamaService);

        this.app.get('/api/tags', (req, res) => tagsController.getTags(req, res));
        this.app.post('/api/chat', (req, res) => chatController.postChat(req, res));
    }

    public async start(): Promise<void> {
        this.setupRoutes();

        const server = this.app.listen(process.env.VITE_SERVER_PORT, () => {
            console.log(`🚀 Server running on http://${process.env.VITE_SERVER_HOST}:${process.env.VITE_SERVER_PORT}`);
        });

        return new Promise((resolve) => server.on('error', resolve));
    }
}

const server = new Server();

server.start().catch((err) => {
    console.error('Fatal error starting server:', err);
    process.exit(1);
});
