import { Request, Response } from 'express';
import { OllamaService } from '../services/OllamaService';
import { ChatRequest } from '../interfaces/ChatRequest';

export class ChatController {
    private ollamaService: OllamaService;

    constructor(ollamaService: OllamaService) {
        this.ollamaService = ollamaService;
    }

    public async postChat(req: Request, res: Response): Promise<void> {
        const { model, messages } = req.body as ChatRequest;

        if (!model || !messages) {
            res.status(400).json({ error: 'Dados de chat incompletos.' });

            return;
        }

        try {
            // writes the response in stream format
            const stream = await this.ollamaService.streamChat({ model, messages });

            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            for await (const chunk of stream) {
                res.write(chunk);
            }

            res.end();
        } catch (error) {
            console.error('Erro no ChatController:', error);

            if (!res.headersSent) {
                res.status(500).json({
                    error: (error as Error).message || 'Erro interno do servidor',
                });
            }
        }
    }
}
