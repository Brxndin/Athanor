import { Request, Response } from 'express';
import { OllamaService } from '../services/OllamaService';

export class TagsController {
    private ollamaService: OllamaService;

    constructor(ollamaService: OllamaService) {
        this.ollamaService = ollamaService;
    }

    public async getTags(req: Request, res: Response): Promise<void> {
        try {
            const tags = await this.ollamaService.getTags();

            res.json(tags);
        } catch (error) {
            console.error('Erro no TagsController:', error);

            res.status(500).json({ error: (error as Error).message || 'Erro desconhecido' });
        }
    }
}
