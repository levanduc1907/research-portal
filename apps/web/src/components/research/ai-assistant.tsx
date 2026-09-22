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
import { BlockILogo } from "./illinois-logo";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  sources?: ChatCitationDto[];
  route?: string;
  isStreaming?: boolean;
}

const SUGGESTIONS = [
  "Trường gần đây nghiên cứu về lĩnh vực nào?",
  "Những bài báo nào nổi bật nhất?",
  "Chủ đề nào có nhiều nghiên cứu nhất?",
  "Researcher nào nghiên cứu về AI?",
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
      text: "Xin chào! Tôi là **Trợ lý Nghiên cứu AI của Đại học Illinois (UIUC)**. Bạn có thể hỏi tôi về các hướng nghiên cứu gần đây, các bài báo nổi bật, giáo sư tiêu biểu hoặc xu hướng học thuật 2 năm qua.",
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
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const stream = researchApi.streamAssistant(text, controller.signal);
      for await (const chunk of stream) {
        if (chunk.sources || chunk.route) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, sources: chunk.sources, route: chunk.route }
                : msg
            )
          );
        }
        if (chunk.token) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, text: msg.text + chunk.token }
                : msg
            )
          );
        }
        if (chunk.done) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId ? { ...msg, isStreaming: false } : msg
            )
          );
          setIsStreaming(false);
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  text: "Lỗi kết nối tới AI backend.",
                  isStreaming: false,
                }
              : msg
          )
        );
      }
      setIsStreaming(false);
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setMessages((prev) =>
      prev.map((msg) => (msg.isStreaming ? { ...msg, isStreaming: false } : msg))
    );
  };

  const handleClear = () => {
    handleStop();
    setMessages([
      {
        id: "welcome",
        sender: "assistant",
        text: "Hội thoại đã được làm mới. Tôi có thể hỗ trợ gì cho bạn về các nghiên cứu tại UIUC?",
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
          className="group relative flex items-center gap-2.5 rounded-full bg-[#13294B] border-2 border-[#FF5F05] p-3 sm:px-5 sm:py-3.5 text-white shadow-2xl hover:bg-[#0E1F3B] hover:scale-105 active:scale-95 transition-all duration-200"
        >
          {/* Pulsing ring indicator */}
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF5F05] opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#FF5F05] border-2 border-white" />
          </span>

          <BlockILogo className="w-5 h-6 drop-shadow-sm" withOutline={false} />
          <span className="hidden sm:inline font-bold text-sm tracking-tight">
            UIUC AI Assistant
          </span>
        </button>
      </div>

      {/* 2. Sleek Floating Mini Popup Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 flex flex-col w-[94vw] sm:w-[440px] h-[590px] max-h-[calc(100vh-7.5rem)] rounded-2xl border-2 border-[#13294B] bg-white shadow-2xl dark:border-slate-700 dark:bg-[#0E1726] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between bg-[#13294B] px-4 py-3.5 text-white">
            <div className="flex items-center gap-2.5">
              <BlockILogo className="w-5 h-6.5" withOutline={false} />
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-white font-heading">
                    UIUC Research AI
                  </h3>
                  <span className="flex h-2 w-2 rounded-full bg-[#FF5F05]" />
                </div>
                <p className="text-[10px] text-slate-300 font-medium">
                  Streaming • Grounded RAG Assistant
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClear}
                title="Làm mới hội thoại"
                className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={toggleOpen}
                title="Thu nhỏ"
                className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs sm:text-sm bg-slate-50/50 dark:bg-[#0A1120]/60">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.sender === "assistant" && (
                  <div className="flex h-6 w-7 shrink-0 items-center justify-center rounded bg-[#13294B] mt-0.5 shadow-sm">
                    <BlockILogo className="w-3.5 h-4.5" withOutline={false} />
                  </div>
                )}

                <div
                  className={`max-w-[84%] rounded-xl p-3.5 leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-[#13294B] text-white rounded-br-none shadow-sm"
                      : "bg-white text-slate-800 dark:bg-[#132038] dark:text-slate-200 rounded-bl-none border border-slate-200 dark:border-slate-800 shadow-sm"
                  }`}
                >
                  {/* Message text */}
                  <div className="whitespace-pre-wrap font-normal">
                    {msg.text}
                    {/* Blinking cursor while streaming */}
                    {msg.isStreaming && (
                      <span className="inline-block w-1.5 h-3.5 bg-[#FF5F05] animate-pulse ml-1 translate-y-0.5 font-mono">
                        ▍
                      </span>
                    )}
                  </div>

                  {/* Grounded Citation Chips */}
                  {msg.sources && msg.sources.length > 0 && !msg.isStreaming && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-[#FF5F05] uppercase tracking-wider mb-1.5">
                        <BookOpen className="w-3 h-3 text-[#FF5F05]" />
                        <span>Tài Liệu Tham Khảo (Citations)</span>
                      </div>
                      <div className="space-y-1.5">
                        {msg.sources.map((s) => (
                          <div
                            key={s.paperId}
                            className="rounded-lg bg-slate-50 dark:bg-[#0A1120] p-2 text-[11px] border border-slate-200 dark:border-slate-800"
                          >
                            <p className="font-bold line-clamp-1 text-[#13294B] dark:text-slate-200">
                              {s.title}
                            </p>
                            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                              <span>Năm: {s.year} • {s.citedByCount} trích dẫn</span>
                              {s.doi && (
                                <a
                                  href={s.doi.startsWith("http") ? s.doi : `https://doi.org/${s.doi}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[#FF5F05] hover:underline flex items-center gap-0.5 font-bold"
                                >
                                  <span>Xem Bài Báo</span>
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

          {/* Quick Suggestion Chips */}
          {messages.length <= 2 && (
            <div className="px-4 pb-2 bg-white dark:bg-[#0E1726]">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Câu hỏi gợi ý
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleSend(chip)}
                    className="rounded-full bg-slate-100 hover:bg-[#FF5F05] hover:text-white px-2.5 py-1 text-[11px] font-medium text-slate-700 transition-colors dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-[#FF5F05] dark:hover:text-white border border-slate-200 dark:border-slate-700"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Bar */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1726]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Đặt câu hỏi về nghiên cứu UIUC..."
                disabled={isStreaming}
                className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF5F05] focus:ring-1 focus:ring-[#FF5F05] dark:border-slate-700 dark:bg-[#0A1120] dark:text-white"
              />

              {isStreaming ? (
                <button
                  type="button"
                  onClick={handleStop}
                  title="Dừng tạo phản hồi"
                  className="rounded-lg bg-rose-600 p-2.5 text-white hover:bg-rose-700 transition-all shadow-sm"
                >
                  <Square className="w-4 h-4 fill-white" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  title="Gửi câu hỏi"
                  className="rounded-lg bg-[#FF5F05] p-2.5 text-white hover:bg-[#E84A27] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
