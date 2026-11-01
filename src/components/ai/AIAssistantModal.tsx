/**
 * GOLDRIX AI Customer Support & Trading Assistant Bot Modal
 * Powered by Gemini AI via server-side proxy API.
 */

import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api.ts';
import {
  X,
  Bot,
  Send,
  Sparkles,
  HelpCircle,
  TrendingUp,
  Layers,
  ArrowDownLeft,
  Users,
  ShieldCheck,
  Headphones,
  RotateCcw,
} from 'lucide-react';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDeposit?: () => void;
  onNavigateTab?: (tab: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

const QUICK_QUESTIONS = [
  { label: 'ما هي خطط الاستثمار الست؟', icon: Layers },
  { label: 'كيف أودع USDT عبر TRC20؟', icon: ArrowDownLeft },
  { label: 'كيف يعمل روبوت التداول الذكي؟', icon: TrendingUp },
  { label: 'كيف أربح من نظام الإحالة (10$ + 3%)؟', icon: Users },
  { label: 'ما هي تراخيص المنصة في أستراليا وقبرص ودبي؟', icon: ShieldCheck },
  { label: 'كيف أتواصل مع فريق الدعم الفني؟', icon: Headphones },
];

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  onOpenDeposit,
  onNavigateTab,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'مرحباً بك في GOLDRIX! أنا المساعد الذكي المخصص لخدمتك. يمكنني شرح روبوتات التداول، الخطط الاستثمارية الست، طرق الإيداع والسحب، نظام أرباح الإحالة (10$ + 3%)، وتراخيص المنصة الرسمية. كيف يمكنني مساعدتك اليوم؟',
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.sendChatMessage(text);
      const assistantMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'assistant',
        text: response.reply,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        sender: 'assistant',
        text: 'عذراً، حدث خطأ مؤقت في الاتصال. يمكنك إعادة المحاولة أو مراجعة الأسئلة الشائعة حول الإيداع والتداول والخطط.',
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'assistant',
        text: 'أهلاً بك مجدداً في GOLDRIX! اختر أحد الأسئلة السريعة أدناه أو اكتب استفسارك مباشرة.',
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg h-[85vh] flex flex-col shadow-2xl relative overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-950/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-white">مساعد GOLDRIX الذكي</h3>
                <span className="flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 font-medium">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>AI Powered</span>
                </span>
              </div>
              <p className="text-[10px] text-neutral-400">إجابات فورية عن التداول والخطط والإيداع والتراخيص</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleResetChat}
              title="إعادة بدء المحادثة"
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3 leading-relaxed whitespace-pre-line shadow-sm ${
                  m.sender === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-none font-medium'
                    : 'bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-bl-none'
                }`}
              >
                {m.text}
              </div>
              <span className="text-[9px] text-neutral-400 mt-1 px-1">{m.timestamp}</span>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-neutral-400 bg-neutral-950 border border-neutral-800 rounded-2xl px-3 py-2 w-fit">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
              <span className="text-[11px]">المساعد الذكي يقوم بصياغة الإجابة...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Question Chips */}
        <div className="px-3 py-2 bg-neutral-950/60 border-t border-neutral-800/60 flex items-center gap-1.5 overflow-x-auto scrollbar-none whitespace-nowrap">
          {QUICK_QUESTIONS.map((q, idx) => {
            const Icon = q.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(q.label)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-[11px] text-neutral-300 hover:text-white border border-neutral-800 transition-colors shrink-0 cursor-pointer"
              >
                <Icon className="w-3 h-3 text-emerald-400" />
                <span>{q.label}</span>
              </button>
            );
          })}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 bg-neutral-950 border-t border-neutral-800 flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اسأل المساعد الذكي عن أي استفسار بالمنصة..."
            className="flex-1 bg-neutral-900 border border-neutral-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-neutral-950 rounded-xl font-bold transition-all shadow-md shadow-emerald-500/20 cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4 rtl:-scale-x-100" />
          </button>
        </form>

      </div>
    </div>
  );
};
