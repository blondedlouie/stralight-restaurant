"use client";

import React, { useState } from 'react';
import { MessageSquare, X, Send, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const faqs: Record<string, string> = {
  "What are the prices?": "Fried Chicken meals start from KES 400 with chips. Classic Pizzas are KES 600 (Regular) to KES 1300 (Mega). Wings combos start from KES 300.",
  "Where are you located?": "Branches in Eastleigh (Jam, 4th St, Donbosco, Juja B, Nova, Sec 3, 6th, 5th), South C, James Gichuru, Hurlingham, Muthangari, and Bamburi.",
  "Operating hours?": "All branches are open daily from 10:00 AM to 2:00 AM.",
  "Payment methods": "We accept direct M-PESA STK Push on checkout, cash upon pickup, and in-store card payments."
};

export const AIFloatingSupport = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ sender: 'ai' | 'user'; text: string }[]>([
    { sender: 'ai', text: 'Welcome to Starlight Restaurant. How can I help you with our menu or locations today?' }
  ]);
  const [input, setInput] = useState('');

  const handleSend = (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg = query.trim();
    const newMsgs = [...messages, { sender: 'user' as const, text: userMsg }];
    setMessages(newMsgs);
    setInput('');

    setTimeout(() => {
      let reply = "I could not find an exact match. You can chat directly with our branch team on WhatsApp Business.";
      for (const [key, val] of Object.entries(faqs)) {
        if (userMsg.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(userMsg.toLowerCase())) {
          reply = val;
          break;
        }
      }
      setMessages([...newMsgs, { sender: 'ai', text: reply }]);
    }, 400);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-80 md:w-96 bg-brand-surface border border-brand-border rounded-2xl shadow-2xl flex flex-col h-[460px] overflow-hidden mb-3"
          >
            <div className="bg-brand-primary text-brand-bg p-4 flex justify-between items-center font-black">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 fill-current" />
                <span>Starlight AI Support</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-black/10 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl max-w-[85%] ${
                    m.sender === 'ai'
                      ? 'bg-brand-bg text-brand-ink border border-brand-border'
                      : 'bg-brand-primary text-brand-ink ml-auto font-medium'
                  }`}
                >
                  {m.text}
                </div>
              ))}

              <div className="flex flex-wrap gap-1.5 pt-2">
                {Object.keys(faqs).map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(q)}
                    className="text-[11px] bg-brand-bg hover:border-brand-accent border border-brand-border text-brand-ink px-2.5 py-1 rounded-full transition"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 border-t border-brand-border bg-brand-bg space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask a question..."
                  className="flex-1 bg-brand-surface border border-brand-border rounded-xl px-3 py-2 text-xs text-brand-ink focus:outline-none focus:border-brand-accent"
                />
                <button
                  onClick={() => handleSend()}
                  className="bg-brand-primary text-brand-bg p-2 rounded-xl hover:bg-brand-primaryHover transition"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              <a
                href="https://wa.me/254726744444"
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-bold py-1"
              >
                <MessageCircle className="w-4 h-4" /> Chat on WhatsApp Business
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-brand-primary hover:bg-brand-primaryHover text-brand-bg flex items-center justify-center shadow-lg transition"
      >
        <MessageSquare className="w-6 h-6 fill-current" />
      </button>
    </div>
  );
};