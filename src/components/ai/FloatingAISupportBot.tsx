/**
 * GOLDRIX Compact Corner AI Support & Expert Bot
 * - Small circular icon button in the bottom corner of the screen
 * - Pure conversational AI that answers each user question directly and separately
 * - No static FAQ list clutter inside the bot
 */

import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { useLanguage } from '../../context/LanguageContext.tsx';
import {
  Bot,
  X,
  Send,
  Sparkles,
  ChevronDown,
  RotateCcw,
  MessageSquarePlus,
} from 'lucide-react';

interface FloatingAISupportBotProps {
  onOpenSupportTickets?: () => void;
  onOpenDeposit?: () => void;
  onNavigateTab?: (tab: string) => void;
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

interface ChatItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const FloatingAISupportBot: React.FC<FloatingAISupportBotProps> = ({
  onOpenSupportTickets,
  externalOpen,
  onExternalOpenChange,
}) => {
  const { isRtl } = useLanguage();
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setIsOpen = (val: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof val === 'function' ? val(isOpen) : val;
    setInternalOpen(next);
    onExternalOpenChange?.(next);
  };
  const [messages, setMessages] = useState<ChatItem[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'مرحباً بك! أنا خبير الذكاء الاصطناعي في GOLDRIX. اكتب أي سؤال لديك بالأسفل وسأجيبك عليه مباشرة بشكل منفصل ودقيق.',
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const nowTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatItem = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: nowTime,
    };

    // Show each question & its AI answer cleanly
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.sendChatMessage(text);
      const aiMsg: ChatItem = {
        id: `a_${Date.now()}`,
        sender: 'assistant',
        text: response.reply,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errMsg: ChatItem = {
        id: `e_${Date.now()}`,
        sender: 'assistant',
        text: 'عذراً، تعذر الاتصال المؤقت. يرجى إعادة إرسال سؤالك.',
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        sender: 'assistant',
        text: 'تم فتح محادثة جديدة. تفضل بكتابة سؤالك وسأجيبك عليه فوراً.',
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="fixed bottom-16 md:bottom-5 left-4 z-40 flex flex-col items-start">
      {/* Compact AI Chat Window */}
      {isOpen && (
        <div
          dir={isRtl ? 'rtl' : 'ltr'}
          className="mb-2.5 w-[calc(100vw-2rem)] sm:w-[340px] h-[420px] max-h-[72vh] bg-[#181D27] border border-neutral-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-3.5 py-2.5 bg-[#131720] border-b border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">
                    {isRtl ? 'خبير الذكاء الاصطناعي' : 'AI Support Bot'}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
                <p className="text-[10px] text-neutral-400">
                  {isRtl ? 'اكتب سؤالك للحصول على إجابة فورية' : 'Ask any question for an instant answer'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {onOpenSupportTickets && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenSupportTickets();
                  }}
                  title={isRtl ? 'تذكرة دعم' : 'Support Ticket'}
                  className="p-1.5 text-neutral-400 hover:text-emerald-400 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                >
                  <MessageSquarePlus className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={handleClear}
                title={isRtl ? 'محادثة جديدة' : 'Clear'}
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs bg-[#181D27]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 leading-relaxed whitespace-pre-line ${
                    m.sender === 'user'
                      ? 'bg-emerald-500 text-neutral-950 font-bold rounded-br-xs'
                      : 'bg-[#212836] border border-neutral-700/70 text-neutral-100 rounded-bl-xs'
                  }`}
                >
                  {m.text}
                </div>
                <span className="text-[9px] text-neutral-500 mt-1 px-1 font-mono">
                  {m.timestamp}
                </span>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-neutral-300 bg-[#212836] border border-neutral-700/70 rounded-2xl px-3 py-2 w-fit">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                <span className="text-[11px]">
                  {isRtl ? 'جاري كتابة الإجابة...' : 'AI is typing...'}
                </span>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* Direct Question Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-2.5 bg-[#131720] border-t border-neutral-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isRtl ? 'اكتب سؤالك هنا...' : 'Type your question...'}
              className="flex-1 bg-[#212836] border border-neutral-700/80 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-neutral-950 rounded-xl font-bold transition-colors cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5 rtl:-scale-x-100" />
            </button>
          </form>
        </div>
      )}

      {/* Small Circular Corner Icon Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title={isRtl ? 'خبير الذكاء الاصطناعي' : 'AI Support'}
        aria-label={isRtl ? 'خبير الذكاء الاصطناعي' : 'AI Support'}
        className="relative w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 flex items-center justify-center shadow-lg shadow-emerald-500/25 border border-emerald-300/60 transition-transform active:scale-95 cursor-pointer"
      >
        {isOpen ? <X className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        {!isOpen && (
          <span className="w-2 h-2 rounded-full bg-emerald-300 ring-2 ring-[#181D27] absolute top-0 right-0" />
        )}
      </button>
    </div>
  );
};
