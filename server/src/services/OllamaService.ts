import { ChatRequest } from "../interfaces/ChatRequest";

export class OllamaService {
    private ollamaUrl = `http://${process.env.OLLAMA_HOST}:${process.env.OLLAMA_PORT}`;

    public async getTags(): Promise<unknown> {
        try {
            const response = await fetch(`${this.ollamaUrl}/api/tags`);

            if (!response.ok) {
                throw new Error('Falha ao buscar tags do Ollama.');
            }

            const data = await response.json();

            return data;
        } catch (error) {
            console.error('Erro no OllamaService.getTags:', error);

            throw new Error('Erro de comunicação com o serviço Ollama.');
        }
    }

    public async streamChat(request: ChatRequest): Promise<AsyncIterable<Uint8Array>> {
        const body = JSON.stringify({
            model: request.model,
            messages: request.messages,
            stream: true,
            options: {
                num_ctx: 8192,
            },
        });

        const response = await fetch(`${this.ollamaUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: body,
        });

        if (!response.ok) {
            throw new Error(`Ollama retornou erro HTTP: ${response.status}`);
        }

        return response.body as unknown as AsyncIterable<Uint8Array>;
    }
}
