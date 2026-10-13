import { marked } from 'marked';
import { useState, useEffect, useRef } from 'preact/hooks';

const SERVER_HOST = import.meta.env.VITE_SERVER_HOST;
const SERVER_PORT = import.meta.env.VITE_SERVER_PORT;

const API_URL = `http://${SERVER_HOST}:${SERVER_PORT}/api`;

function parseMessage(rawText: string) {
    let think = null;
    let content = rawText;

    const startTag = '<think>';
    const endTag = '</think>';
    
    const startIndex = rawText.indexOf(startTag);

    if (startIndex !== -1) {
        const endIndex = rawText.indexOf(endTag);
        
        if (endIndex !== -1) {
            think = rawText.substring(startIndex + startTag.length, endIndex).trim();
            content = rawText.substring(0, startIndex) + rawText.substring(endIndex + endTag.length);
        } else {
            think = rawText.substring(startIndex + startTag.length).trim();
            content = rawText.substring(0, startIndex);
        }
    }

    return { think, content: content.trim() };
}

export function App() {
    const [models, setModels] = useState([]);
    const [selectedModel, setSelectedModel] = useState('');
    const [messages, setMessages] = useState<{ role: string; content: string; images?: string[] }[]>([]);
    const [inputText, setInputText] = useState('');
    const [persona, setPersona] = useState('');
    // const [webSearchEnabled, setWebSearchEnabled] = useState(false);
    const [currentBase64Image, setCurrentBase64Image] = useState<string | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetch(`${API_URL}/tags`)
            .then((res) => res.json())
            .then((data) => {
                setModels(data.models || []);
                if (data.models?.length > 0) setSelectedModel(data.models[0].name);
            })
            .catch((e) => console.error('Erro ao carregar modelos', e));
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleImageUpload = (e: Event) => {
        const target = e.currentTarget as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64Raw = ev.target?.result as string;
            setCurrentBase64Image(base64Raw.split(',')[1] ?? null);
        };
        reader.readAsDataURL(file);
        
        // Reseta o input para permitir enviar a mesma imagem novamente se o usuário apagar
        target.value = ''; 
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        // Envia com Enter. Pula linha com Shift + Enter
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const sendMessage = async () => {
        if (!inputText.trim() && !currentBase64Image) return;
        if (!selectedModel) return alert('Selecione um modelo!');

        setIsStreaming(true);
        let currentHistory = [...messages];

        if (currentHistory.length === 0 && persona.trim()) {
            currentHistory.push({ role: 'system', content: persona.trim() });
        }

        const newUserMsg = {
            role: 'user',
            content: inputText,
            ...(currentBase64Image && { images: [currentBase64Image] }),
        };
        currentHistory.push(newUserMsg);

        setMessages([...currentHistory]);
        setInputText('');
        setCurrentBase64Image(null);

        try {
            const response = await fetch(`${API_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: selectedModel,
                    messages: currentHistory,
                    // webSearch: webSearchEnabled,
                }),
            });

            if (!response.body) throw new Error('Falha no stream');

            let assistantMsg = { role: 'assistant', content: '' };
            setMessages((prev) => [...prev, assistantMsg]);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter((line) => line.trim() !== '');

                for (const line of lines) {
                    const json = JSON.parse(line);
                    if (json.message?.content) {
                        assistantMsg.content += json.message.content;
                        setMessages((prev) => {
                            const newMsgs = [...prev];
                            newMsgs[newMsgs.length - 1] = { ...assistantMsg };
                            return newMsgs;
                        });
                    }
                }
            }
        } catch (err) {
            console.error(err);
            setMessages((prev) => [...prev, { role: 'assistant', content: 'Erro de conexão com o servidor.' }]);
        } finally {
            setIsStreaming(false);
        }
    };

    return (
        <div id="app">
            <header>
                <h1>Athanor</h1>
                <div className="controls">
                    <select id="modelInput" value={selectedModel} onChange={(e) => setSelectedModel((e.currentTarget as HTMLSelectElement).value)}>
                        {models.length === 0 ? <option>Carregando...</option> : null}
                        {models.map((m: any) => (
                            <option key={m.name} value={m.name}>
                                {m.name}
                            </option>
                        ))}
                    </select>
                    {/* <label className="toggle-label">
                        <input 
                            type="checkbox" 
                            checked={webSearchEnabled} 
                            onChange={(e) => setWebSearchEnabled((e.currentTarget as HTMLInputElement).checked)} 
                        />
                        🌐 Busca Web
                    </label> */}
                </div>
            </header>

            <div className="persona-bar">
                <input
                    type="text"
                    placeholder="Defina a persona da IA (Ex: Responda como um pirata...)"
                    value={persona}
                    onInput={(e) => setPersona((e.currentTarget as HTMLInputElement).value)}
                    disabled={messages.length > 0}
                />
            </div>

            <div id="chat-container">
                {messages
                    .filter((m) => m.role !== 'system')
                    .map((msg, i) => {
                        const { think, content } = parseMessage(msg.content);
                        const isAssistant = msg.role === 'assistant';

                        const isWaitingForServer = isAssistant && isStreaming && i === messages.length - 1 && msg.content === '';

                        return (
                            <div key={i} className={`message ${msg.role}`}>
                                {isWaitingForServer && (
                                    <div className="typing-indicator">
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                )}

                                {isAssistant && think && (
                                    <details className="thinking-box" open={i === messages.length - 1}>
                                        <summary>🤔 Pensando...</summary>
                                        <div className="thinking-content">{think}</div>
                                    </details>
                                )}

                                {content && (
                                    <div 
                                        className="markdown-body"
                                        dangerouslySetInnerHTML={{ __html: marked.parse(content) as string }} 
                                    />
                                )}

                                {msg.images && (
                                    <img src={`data:image/png;base64,${msg.images[0]}`} alt="Imagem anexada" />
                                )}
                            </div>
                        );
                    })}
                <div ref={chatEndRef} />
            </div>

            <footer>
                {currentBase64Image && (
                    <div id="preview-area">
                        <div className="img-preview">
                            <img src={`data:image/png;base64,${currentBase64Image}`} alt="Preview" />
                            <button title="Remover imagem" onClick={() => setCurrentBase64Image(null)}>×</button>
                        </div>
                    </div>
                )}
                
                <div className="input-box">
                    <button className="btn-icon" title="Anexar Imagem" onClick={() => fileInputRef.current?.click()}>
                        ➕
                    </button>
                    <input 
                        type="file" 
                        accept="image/*" 
                        ref={fileInputRef}
                        style={{ display: 'none' }} 
                        onChange={handleImageUpload} 
                    />
                    
                    <textarea
                        id="userInput"
                        value={inputText}
                        onInput={(e) => setInputText((e.currentTarget as HTMLTextAreaElement).value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Digite sua mensagem... (Enter envia, Shift+Enter pula linha)"
                        disabled={isStreaming}
                    ></textarea>
                    
                    <button className="btn bg-blue" onClick={sendMessage} disabled={isStreaming}>
                        {isStreaming ? 'Enviando...' : 'Enviar'}
                    </button>
                    
                    <button
                        className="btn bg-red"
                        onClick={() => {
                            setMessages([]);
                            setPersona('');
                            setCurrentBase64Image(null);
                        }}
                    >
                        Limpar
                    </button>
                </div>
            </footer>
        </div>
    );
}
