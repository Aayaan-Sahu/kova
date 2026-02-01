import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';
import { sendChatMessage } from '../lib/chatApi';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

interface ChatPanelProps {
    sessionId: string | null;
    isListening: boolean;
}

export const ChatPanel = ({ sessionId, isListening }: ChatPanelProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input when panel opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSend = async () => {
        if (!inputValue.trim() || isLoading) return;

        if (!sessionId) {
            setError('Please start listening to begin the call first.');
            return;
        }

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: inputValue.trim(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setError(null);
        setIsLoading(true);

        try {
            const response = await sendChatMessage(sessionId, userMessage.content);
            const assistantMessage: Message = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: response,
            };
            setMessages(prev => [...prev, assistantMessage]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            {/* Floating Chat Button */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsOpen(true)}
                        className={cn(
                            "fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-lg transition-colors duration-300",
                            "bg-brand-500 hover:bg-brand-400 text-white",
                            "shadow-[0_0_30px_rgba(14,165,233,0.4)]"
                        )}
                    >
                        <MessageCircle className="w-6 h-6" />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Chat Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                            "fixed bottom-6 right-6 z-50 w-96 h-[500px] flex flex-col",
                            "bg-neutral-900/95 backdrop-blur-xl border border-neutral-800 rounded-2xl shadow-2xl",
                            "shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                        )}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center">
                                    <MessageCircle className="w-5 h-5 text-brand-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white text-sm">Kova Assistant</h3>
                                    <p className="text-xs text-neutral-500">
                                        {isListening ? 'Listening to your call...' : 'Start listening to ask questions'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-neutral-400" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.length === 0 && (
                                <div className="text-center text-neutral-500 text-sm py-8">
                                    <p className="mb-2">👋 Hi! I'm your protective companion.</p>
                                    <p>Ask me anything about the call you're on.</p>
                                </div>
                            )}

                            {messages.map((message) => (
                                <motion.div
                                    key={message.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={cn(
                                        "max-w-[80%] px-4 py-2.5 rounded-2xl text-sm",
                                        message.role === 'user'
                                            ? "ml-auto bg-brand-500 text-white rounded-br-md"
                                            : "mr-auto bg-neutral-800 text-neutral-100 rounded-bl-md"
                                    )}
                                >
                                    {message.content}
                                </motion.div>
                            ))}

                            {isLoading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex items-center gap-2 text-neutral-400 text-sm"
                                >
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Thinking...</span>
                                </motion.div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="mx-4 mb-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">
                                {error}
                            </div>
                        )}

                        {/* Input */}
                        <div className="p-4 border-t border-neutral-800">
                            <div className="flex items-center gap-2">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={isListening ? "Ask about this call..." : "Start listening first..."}
                                    disabled={!isListening}
                                    className={cn(
                                        "flex-1 bg-neutral-800/50 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm",
                                        "placeholder:text-neutral-500 text-white outline-none",
                                        "focus:border-brand-500/50 transition-colors",
                                        "disabled:opacity-50 disabled:cursor-not-allowed"
                                    )}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!inputValue.trim() || isLoading || !isListening}
                                    className={cn(
                                        "p-2.5 rounded-xl transition-all",
                                        inputValue.trim() && !isLoading && isListening
                                            ? "bg-brand-500 text-white hover:bg-brand-400"
                                            : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                                    )}
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};
