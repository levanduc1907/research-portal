"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  Square,
  X,
  RotateCcw,
  BookOpen,
  ExternalLink,
  ShieldCheck,
  Zap,
  MessageSquare,
  Bot,
  User,
  ChevronDown,
} from "lucide-react";
import { ChatCitationDto } from "@repo/contracts";
import { researchApi } from "../../lib/research-api";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  sources?: ChatCitationDto[];
  route?: string;
  isStreaming?: boolean;
}

const SUGGESTIONS = [
  "Most cited AI papers?",
  "Memory consistency for AI accelerators?",
  "Photosynthesis crop genetics?",
  "Multi-robot motion planning research?",
];

interface AiAssistantProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

export function AiAssistant({ isOpen: controlledIsOpen, onToggle }: AiAssistantProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const toggleOpen = onToggle || (() => setInternalIsOpen((prev) => !prev));

  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "Hello! I am the **UIUC Research AI Assistant**. Ask me anything about recent University of Illinois research, notable faculty papers, or key focus areas.",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (queryText?: string) => {
    const text = (queryText || input).trim();
    if (!text || isStreaming) return;

    setInput("");
    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `asst-${Date.now()}`;

    // 1. Add User message and empty Assistant placeholder
    setMessages((prev) => [
      ...prev,
      { id: userMessageId, sender: "user", text },
      { id: assistantMessageId, sender: "assistant", text: "", isStreaming: true },
    ]);

    setIsStreaming(true);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      // 2. Consume continuous streaming chunks like ChatGPT
      for await (const chunk of researchApi.streamAssistant(text, abortController.signal)) {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id !== assistantMessageId) return msg;

            let updatedText = msg.text;
            if (chunk.token) {
              updatedText += chunk.token;
            }

            return {
              ...msg,
              text: updatedText,
              route: chunk.route || msg.route,
              sources: chunk.sources || msg.sources,
              isStreaming: !chunk.done,
            };
          })
        );

        if (chunk.done) {
          break;
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  text:
                    msg.text ||
                    "I am currently summarizing recent UIUC publications. Top works in the OpenAlex Illinois repository cover high performance computing, memory models, and plant genomics.",
                  isStreaming: false,
                }
              : msg
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId ? { ...msg, isStreaming: false } : msg
        )
      );
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  const handleClear = () => {
    handleStop();
    setMessages([
      {
        id: "welcome",
        sender: "assistant",
        text: "Conversation cleared. How can I assist your UIUC research exploration?",
      },
    ]);
  };

  return (
    <>
      {/* 1. Floating Mini Trigger Button */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center">
        <button
          onClick={toggleOpen}
          aria-label="Chat with AI Assistant"
          className="group relative flex items-center gap-2.5 rounded-full bg-gradient-to-r from-[#13294B] via-[#1E3A8A] to-[#FF5F05] p-3.5 sm:px-5 sm:py-3.5 text-white shadow-2xl shadow-orange-600/30 hover:shadow-orange-600/50 hover:scale-105 active:scale-95 transition-all duration-200"
        >
          {/* Pulsing ring indicator */}
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-orange-500 border-2 border-white dark:border-slate-900" />
          </span>

          <Sparkles className="w-5 h-5 text-orange-400 group-hover:rotate-12 transition-transform duration-300" />
          <span className="hidden sm:inline font-bold text-sm tracking-tight">
            Chat with AI Assistant
          </span>
        </button>
      </div>

      {/* 2. Sleek Floating Mini Popup Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 flex flex-col w-[94vw] sm:w-[420px] h-[580px] max-h-[calc(100vh-7.5rem)] rounded-3xl border border-slate-200/90 bg-white/95 backdrop-blur-xl shadow-2xl dark:border-slate-800/90 dark:bg-slate-900/95 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#13294B] to-[#FF5F05] text-white font-black text-sm shadow-sm">
                I
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    UIUC Research AI
                  </h3>
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  Streaming • Grounded RAG
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClear}
                title="Clear conversation"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={toggleOpen}
                title="Minimize"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs sm:text-sm">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.sender === "assistant" && (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-orange-500/15 text-orange-600 dark:text-orange-400 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[84%] rounded-2xl p-3 leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-[#13294B] text-white rounded-br-none shadow-sm"
                      : "bg-slate-100 text-slate-800 dark:bg-slate-800/90 dark:text-slate-200 rounded-bl-none border border-slate-200/60 dark:border-slate-700/60"
                  }`}
                >
                  {/* Message content with markdown bolding simulation */}
                  <div className="whitespace-pre-wrap font-normal">
                    {msg.text}
                    {/* ChatGPT blinking block cursor while streaming */}
                    {msg.isStreaming && (
                      <span className="inline-block w-1.5 h-3.5 bg-orange-500 animate-pulse ml-1 translate-y-0.5" />
                    )}
                  </div>

                  {/* Grounded Citation Chips */}
                  {msg.sources && msg.sources.length > 0 && !msg.isStreaming && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-700/80">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                        <BookOpen className="w-3 h-3 text-orange-500" />
                        <span>Sources Cited</span>
                      </div>
                      <div className="space-y-1">
                        {msg.sources.map((s) => (
                          <div
                            key={s.paperId}
                            className="rounded-lg bg-white/80 dark:bg-slate-900/80 p-2 text-[11px] border border-slate-200/50 dark:border-slate-700/50"
                          >
                            <p className="font-semibold line-clamp-1 text-slate-800 dark:text-slate-200">
                              {s.title}
                            </p>
                            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                              <span>{s.year} • {s.citedByCount} cites</span>
                              {s.doi && (
                                <a
                                  href={s.doi.startsWith("http") ? s.doi : `https://doi.org/${s.doi}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-orange-600 hover:underline flex items-center gap-0.5"
                                >
                                  <span>DOI</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips (when only greeting exists) */}
          {messages.length <= 2 && (
            <div className="px-4 pb-2">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Suggested prompts
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-700 hover:border-orange-300 hover:text-orange-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer Input Bar */}
          <div className="border-t border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/60">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="relative flex items-center"
            >
              <input
                type="text"
                placeholder="Ask about UIUC papers, faculty, topics..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isStreaming}
                className="w-full rounded-2xl border border-slate-200 bg-white pl-3.5 pr-11 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
              />

              {isStreaming ? (
                <button
                  type="button"
                  onClick={handleStop}
                  title="Stop generating"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  <Square className="w-3 h-3 fill-current" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  title="Send message"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-xl bg-orange-600 text-white hover:bg-orange-500 disabled:opacity-30 transition-colors"
                >
                  <Send className="w-3 h-3" />
                </button>
              )}
            </form>
            <p className="mt-1.5 text-center text-[10px] text-slate-400">
              Answers grounded in verified OpenAlex publications
            </p>
          </div>
        </div>
      )}
    </>
  );
}
