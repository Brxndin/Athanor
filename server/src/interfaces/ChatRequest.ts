import { Message } from './Message';

export interface ChatRequest {
    model: string;
    messages: Message[];
    webSearch?: boolean;
}
