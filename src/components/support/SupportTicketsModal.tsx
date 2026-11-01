/**
 * GOLDRIX Support Desk & Interactive Tickets
 * Real-time conversation threads with compliance and technical operations.
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { SupportTicket } from '../../types/index.ts';
import {
  X,
  HelpCircle,
  MessageSquare,
  Send,
  Plus,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface SupportTicketsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportTicketsModal: React.FC<SupportTicketsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);

  // New ticket state
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<'BILLING' | 'ACCOUNT' | 'INVESTMENT' | 'KYC' | 'SECURITY'>('INVESTMENT');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [message, setMessage] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTickets();
    }
  }, [isOpen]);

  const loadTickets = async () => {
    try {
      const list = await api.getSupportTickets();
      setTickets(list);
      if (list.length > 0 && !selectedTicket) {
        setSelectedTicket(list[0]);
      }
    } catch (err) {
      console.error('Failed to load tickets:', err);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) return;

    setIsSubmitting(true);
    try {
      const created = await api.createSupportTicket(subject, category, priority, message);
      setTickets((prev) => [created, ...prev]);
      setSelectedTicket(created);
      setIsCreatingNew(false);
      setSubject('');
      setMessage('');
    } catch (err) {
      console.error('Failed to create ticket:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyContent.trim()) return;

    setIsSubmitting(true);
    try {
      const updated = await api.replySupportTicket(selectedTicket.id, replyContent);
      setSelectedTicket(updated);
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setReplyContent('');
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-3xl w-full p-6 space-y-6 shadow-2xl relative max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Institutional Support Desk</h2>
              <p className="text-[11px] text-neutral-400">Direct line to quantitative engineering and AML officers</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Sidebar list + Detail conversation */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 min-h-[360px] overflow-hidden">
          
          {/* Left: Ticket list & New trigger */}
          <div className="md:col-span-5 flex flex-col space-y-3 border-r border-neutral-800 pr-4 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                setIsCreatingNew(true);
                setSelectedTicket(null);
              }}
              className="w-full py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Open New Inscription</span>
            </button>

            <div className="space-y-2 flex-1">
              {tickets.length === 0 ? (
                <p className="text-xs text-neutral-500 text-center py-8">No tickets opened yet.</p>
              ) : (
                tickets.map((t) => {
                  const isSelected = selectedTicket?.id === t.id && !isCreatingNew;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setSelectedTicket(t);
                        setIsCreatingNew(false);
                      }}
                      className={`w-full p-3 rounded-xl text-left border transition-all ${
                        isSelected
                          ? 'bg-neutral-800/80 border-emerald-500/40 text-white'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                        <span className="text-emerald-400 uppercase">{t.category}</span>
                        <span className="text-neutral-500">{t.status}</span>
                      </div>
                      <div className="text-xs font-bold truncate">{t.subject}</div>
                      <div className="text-[10px] text-neutral-500 mt-1">
                        {new Date(t.updatedAt).toLocaleDateString()} &middot; {t.messages.length} messages
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Conversation view OR Create ticket form */}
          <div className="md:col-span-7 flex flex-col justify-between overflow-hidden">
            {isCreatingNew ? (
              <form onSubmit={handleCreateTicket} className="space-y-4">
                <h3 className="text-sm font-bold text-white">Create New Inquiry</h3>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Inquire on High-Frequency Strategy Yields"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="INVESTMENT">Investment Strategies</option>
                      <option value="ACCOUNT">Account Management</option>
                      <option value="KYC">KYC & Compliance</option>
                      <option value="BILLING">Deposits & Withdrawals</option>
                      <option value="SECURITY">Security & 2FA</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High (Urgent)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Message Description</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Provide relevant details or transaction references..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(false)}
                    className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-xl text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-xl text-xs"
                  >
                    {isSubmitting ? 'Submitting...' : 'Send Inquiry'}
                  </button>
                </div>
              </form>
            ) : selectedTicket ? (
              <div className="flex flex-col h-full justify-between">
                <div>
                  <div className="border-b border-neutral-800 pb-2 mb-3">
                    <span className="text-[10px] font-mono text-emerald-400 uppercase">
                      {selectedTicket.category} &middot; {selectedTicket.priority} Priority
                    </span>
                    <h3 className="text-sm font-bold text-white">{selectedTicket.subject}</h3>
                  </div>

                  {/* Messages feed */}
                  <div className="space-y-3 max-h-56 overflow-y-auto pr-2">
                    {selectedTicket.messages.map((m) => {
                      const isStaff = m.sender === 'STAFF';
                      return (
                        <div
                          key={m.id}
                          className={`p-3 rounded-xl text-xs space-y-1 ${
                            isStaff
                              ? 'bg-emerald-950/40 border border-emerald-500/20 text-neutral-200'
                              : 'bg-neutral-950 border border-neutral-800 text-neutral-300'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                            <span className={isStaff ? 'text-emerald-400 font-bold' : 'text-neutral-300'}>
                              {m.senderName} {isStaff && '(Staff)'}
                            </span>
                            <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="leading-relaxed">{m.content}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Reply Form */}
                <form onSubmit={handleSendReply} className="pt-3 border-t border-neutral-800 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Write response message..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !replyContent.trim()}
                    className="p-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded-xl font-bold transition-colors disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-neutral-500">
                Select a support ticket or open a new inquiry.
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
