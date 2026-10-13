export interface Message {
    role: 'user' | 'system' | 'assistant';
    content: string;
    images?: string;
}
