"use client";

import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Bot,
  ExternalLink,
  MessageSquareText,
  Minus,
  RotateCcw,
  Send,
  Square,
} from "lucide-react";
import type { ChatCitationDto, ChatStreamStatus } from "@repo/contracts";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { researchApi } from "../../lib/research-api";
import { AssistantMessageContent } from "./assistant-message-content";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  sources?: ChatCitationDto[];
  route?: string;
  isStreaming?: boolean;
  phase?: ChatStreamStatus | "stopped";
  errorMessage?: string;
  requestId?: string;
}

interface StoredConversation {
  version: 1;
  conversationId: string;
  messages: Message[];
  updatedAt: number;
}

const INITIAL_MESSAGE: Message = {
  id: "welcome",
  sender: "assistant",
  text: "Ask about Illinois researchers, recent papers, research areas, or academic trends. Answers include sources when evidence is available.",
};

const SUGGESTIONS = [
  "What research areas are growing at Illinois?",
  "Which recent papers are highly cited?",
  "Who researches artificial intelligence?",
];

const CONVERSATION_STORAGE_KEY = "uiuc-research-assistant-conversation-v1";
const MAX_PERSISTED_MESSAGES = 50;
const MAX_PERSISTED_MESSAGE_LENGTH = 20_000;
const MAX_PERSISTED_SOURCES = 10;

function hasValidSourceCitation(message: Message): boolean {
  if (!message.sources || message.sources.length === 0) return false;
  const citationMatches = message.text.match(/\[(\d+(?:\s*[,;]\s*\d+)*)\]/g);
  if (!citationMatches) return false;

  const citedNumbers = new Set<number>();
  for (const match of citationMatches) {
    const raw = match.slice(1, -1);
    const nums = raw.split(/[,;]/).map((n) => parseInt(n.trim(), 10));
    for (const num of nums) {
      if (!Number.isNaN(num)) citedNumbers.add(num);
    }
  }

  return message.sources.some((_, index) => citedNumbers.has(index + 1));
}

function isConversationId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
}

function restoreMessage(value: unknown): Message | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<Message>;
  if (
    typeof candidate.id !== "string" ||
    (candidate.sender !== "user" && candidate.sender !== "assistant") ||
    typeof candidate.text !== "string"
  ) {
    return null;
  }

  const wasInterrupted =
    candidate.isStreaming === true ||
    candidate.phase === "thinking" ||
    candidate.phase === "generating";
  const sources = Array.isArray(candidate.sources)
    ? candidate.sources
        .filter(
          (source): source is ChatCitationDto =>
            Boolean(source) &&
            typeof source === "object" &&
            typeof source.paperId === "string" &&
            typeof source.title === "string" &&
            typeof source.year === "number" &&
            typeof source.citedByCount === "number",
        )
        .slice(0, MAX_PERSISTED_SOURCES)
    : undefined;

  return {
    id: candidate.id.slice(0, 120),
    sender: candidate.sender,
    text: candidate.text.slice(0, MAX_PERSISTED_MESSAGE_LENGTH),
    sources,
    route:
      typeof candidate.route === "string"
        ? candidate.route.slice(0, 40)
        : undefined,
    isStreaming: false,
    phase: wasInterrupted ? "stopped" : candidate.phase,
    errorMessage:
      typeof candidate.errorMessage === "string"
        ? candidate.errorMessage.slice(0, 2_000)
        : undefined,
    requestId:
      typeof candidate.requestId === "string"
        ? candidate.requestId.slice(0, 100)
        : undefined,
  };
}

function loadStoredConversation(): StoredConversation | null {
  try {
    const raw = window.localStorage.getItem(CONVERSATION_STORAGE_KEY);
    if (!raw) return null;

    const candidate = JSON.parse(raw) as Partial<StoredConversation>;
    if (
      candidate.version !== 1 ||
      !isConversationId(candidate.conversationId) ||
      !Array.isArray(candidate.messages)
    ) {
      return null;
    }

    const messages = candidate.messages
      .map(restoreMessage)
      .filter((message): message is Message => message !== null)
      .slice(-MAX_PERSISTED_MESSAGES);

    if (messages.length === 0) return null;

    return {
      version: 1,
      conversationId: candidate.conversationId,
      messages,
      updatedAt:
        typeof candidate.updatedAt === "number"
          ? candidate.updatedAt
          : Date.now(),
    };
  } catch {
    window.localStorage.removeItem(CONVERSATION_STORAGE_KEY);
    return null;
  }
}

export function AiAssistant(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [isPanelMounted, setIsPanelMounted] = useState(false);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [hasRestoredConversation, setHasRestoredConversation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const conversationIdRef = useRef<string>("");
  const closeTimerRef = useRef<number | null>(null);
  const shouldRestoreTriggerFocusRef = useRef(false);

  useEffect(() => {
    const storedConversation = loadStoredConversation();
    conversationIdRef.current =
      storedConversation?.conversationId ?? crypto.randomUUID();
    if (storedConversation) {
      setMessages(storedConversation.messages);
    }
    setHasRestoredConversation(true);
  }, []);

  useEffect(() => {
    if (!hasRestoredConversation || !conversationIdRef.current) return;

    const persistedMessages = messages
      .map(restoreMessage)
      .filter((message): message is Message => message !== null)
      .slice(-MAX_PERSISTED_MESSAGES);
    const payload: StoredConversation = {
      version: 1,
      conversationId: conversationIdRef.current,
      messages: persistedMessages.length
        ? persistedMessages
        : [INITIAL_MESSAGE],
      updatedAt: Date.now(),
    };

    try {
      window.localStorage.setItem(
        CONVERSATION_STORAGE_KEY,
        JSON.stringify(payload),
      );
    } catch {
      // Storage may be unavailable in private mode or blocked by browser policy.
    }
  }, [hasRestoredConversation, messages]);

  useEffect(() => {
    if (!isOpen) return;
    messagesEndRef.current?.scrollIntoView({
      behavior: isStreaming ? "auto" : "smooth",
      block: "end",
    });
  }, [messages, isOpen, isStreaming]);

  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!isPanelMounted && shouldRestoreTriggerFocusRef.current) {
      shouldRestoreTriggerFocusRef.current = false;
      triggerRef.current?.focus();
    }
  }, [isPanelMounted]);

  const openAssistant = (): void => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsPanelMounted(true);
    setIsOpen(true);
  };

  const finishMinimizing = (): void => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsPanelMounted(false);
  };

  const minimizeAssistant = (): void => {
    shouldRestoreTriggerFocusRef.current = true;
    setIsOpen(false);

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    closeTimerRef.current = window.setTimeout(
      finishMinimizing,
      reducedMotion ? 0 : 320,
    );
  };

  const handleCitationClick = (
    messageId: string,
    citationNumber: number,
  ): void => {
    const targetId = `source-${messageId}-${citationNumber}`;
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      el.classList.add("is-highlighted");
      window.setTimeout(() => {
        el.classList.remove("is-highlighted");
      }, 2000);
    }
  };

  const stopStreaming = (): void => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsStreaming(false);
    setMessages((current) =>
      current.map((message) =>
        message.isStreaming
          ? { ...message, isStreaming: false, phase: "stopped" }
          : message,
      ),
    );
  };

  const sendMessage = async (suggestion?: string): Promise<void> => {
    const query = (suggestion ?? input).trim();
    if (!query || isStreaming || !hasRestoredConversation) return;

    if (!conversationIdRef.current) {
      conversationIdRef.current = crypto.randomUUID();
    }

    const timestamp = Date.now();
    const assistantId = `assistant-${timestamp}`;
    setInput("");
    setIsStreaming(true);
    setMessages((current) => [
      ...current,
      { id: `user-${timestamp}`, sender: "user", text: query },
      {
        id: assistantId,
        sender: "assistant",
        text: "",
        isStreaming: true,
        phase: "thinking",
      },
    ]);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    let receivedText = false;
    let serverError: { message: string; requestId?: string } | undefined;

    try {
      for await (const chunk of researchApi.streamAssistant(
        query,
        conversationIdRef.current,
        controller.signal,
      )) {
        if (chunk.error) {
          serverError = {
            message: chunk.error,
            requestId: chunk.requestId,
          };
          throw new Error(chunk.error);
        }
        if (chunk.token) receivedText = true;
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  text: message.text + (chunk.token ?? ""),
                  sources: chunk.sources ?? message.sources,
                  route: chunk.route ?? message.route,
                  requestId: chunk.requestId ?? message.requestId,
                  phase:
                    chunk.status ??
                    (chunk.token ? "generating" : message.phase),
                  isStreaming:
                    !chunk.done &&
                    chunk.status !== "completed" &&
                    chunk.status !== "error",
                }
              : message,
          ),
        );
      }
    } catch (error: unknown) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        const fallbackMessage =
          error instanceof TypeError
            ? "The web app could not connect to the research API. Check that the API is running and reachable."
            : error instanceof Error &&
                error.message.startsWith("Research API returned")
              ? "The research API rejected the request. Check the API logs for the matching HTTP error."
              : "The research assistant could not complete this request. Please try again.";
        const displayError = serverError?.message ?? fallbackMessage;
        console.error("Research assistant stream failed", {
          requestId: serverError?.requestId,
          error,
        });
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  text: receivedText ? message.text : displayError,
                  errorMessage: receivedText ? displayError : undefined,
                  requestId: serverError?.requestId ?? message.requestId,
                  isStreaming: false,
                  phase: "error",
                }
              : message,
          ),
        );
      }
    } finally {
      abortControllerRef.current = null;
      setIsStreaming(false);
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? { ...message, isStreaming: false }
            : message,
        ),
      );
    }
  };

  const clearConversation = (): void => {
    stopStreaming();
    conversationIdRef.current = crypto.randomUUID();
    window.localStorage.removeItem(CONVERSATION_STORAGE_KEY);
    setMessages([INITIAL_MESSAGE]);
  };

  return (
    <aside className="assistant-shell">
      {!isPanelMounted && (
        <Button
          ref={triggerRef}
          type="button"
          className="assistant-trigger"
          onClick={openAssistant}
          aria-expanded={isOpen}
          aria-controls="research-assistant-panel"
        >
          <span className="assistant-trigger-mark" aria-hidden="true">
            <Bot />
          </span>
          <span>
            <small>Illinois Research</small>
            Ask the assistant
          </span>
          <MessageSquareText aria-hidden="true" />
        </Button>
      )}

      {isPanelMounted && (
        <section
          id="research-assistant-panel"
          className="assistant-panel"
          data-state={isOpen ? "open" : "closed"}
          role="dialog"
          aria-label="Illinois research assistant"
          onAnimationEnd={(event) => {
            if (
              event.target === event.currentTarget &&
              event.animationName === "assistant-exit"
            ) {
              finishMinimizing();
            }
          }}
        >
          <header className="assistant-header">
            <div className="assistant-identity">
              <span className="assistant-mark" aria-hidden="true">
                <Bot />
              </span>
              <div>
                <h2>Research assistant</h2>
                <p>
                  <span aria-hidden="true" /> Evidence-grounded answers
                </p>
              </div>
            </div>
            <div className="assistant-header-actions">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={clearConversation}
                aria-label="Clear conversation"
                title="Clear conversation"
                className="assistant-btn-clear"
              >
                <RotateCcw aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={minimizeAssistant}
                aria-label="Minimize research assistant"
                title="Minimize"
                className="assistant-btn-minimize"
              >
                <Minus aria-hidden="true" />
              </Button>
            </div>
          </header>

          <div className="assistant-messages" aria-live="polite">
            {messages.map((message) => {
              const isWaitingForFirstToken =
                message.sender === "assistant" &&
                Boolean(message.isStreaming) &&
                !message.text;
              const visibleText =
                message.text ||
                (message.phase === "stopped" ? "Generation stopped." : "");

              return (
                <article
                  key={message.id}
                  className={`assistant-message is-${message.sender}`}
                >
                  {message.sender === "assistant" && (
                    <span className="assistant-avatar" aria-hidden="true">
                      <Bot />
                    </span>
                  )}
                  <div className="assistant-message-body">
                    <div className="assistant-message-bubble">
                      {isWaitingForFirstToken ? (
                        <span className="assistant-thinking">
                          Thinking
                          <span
                            className="assistant-thinking-dots"
                            aria-hidden="true"
                          >
                            <i />
                            <i />
                            <i />
                          </span>
                        </span>
                      ) : message.sender === "assistant" ? (
                        <AssistantMessageContent
                          messageId={message.id}
                          text={visibleText}
                          sources={message.sources}
                          isStreaming={message.phase === "generating"}
                          onCitationClick={(citationNumber) =>
                            handleCitationClick(message.id, citationNumber)
                          }
                        />
                      ) : (
                        visibleText
                      )}
                      {message.phase === "generating" &&
                        message.text &&
                        message.sender === "user" && (
                          <span
                            className="assistant-stream-cursor"
                            aria-hidden="true"
                          />
                        )}
                    </div>
                    {message.phase === "error" && message.errorMessage && (
                      <p className="assistant-message-error">
                        {message.errorMessage}
                      </p>
                    )}
                    {message.phase === "error" && message.requestId && (
                      <span className="assistant-error-reference">
                        Reference: {message.requestId}
                      </span>
                    )}
                    {hasValidSourceCitation(message) &&
                      !message.isStreaming && (
                        <div className="assistant-sources">
                          <h3>
                            <BookOpen aria-hidden="true" /> Sources
                          </h3>
                          <ol>
                            {message.sources?.map((source, index) => {
                              const citationNum = index + 1;
                              const sourceId = `source-${message.id}-${citationNum}`;
                              return (
                                <li
                                  key={source.paperId}
                                  id={sourceId}
                                  className="assistant-source-item"
                                >
                                  <span
                                    className="assistant-source-num"
                                    aria-label={`Source [${citationNum}]`}
                                  >
                                    [{citationNum}]
                                  </span>
                                  <div className="assistant-source-details">
                                    <strong>{source.title}</strong>
                                    <span>
                                      {source.year} ·{" "}
                                      {source.citedByCount.toLocaleString()}{" "}
                                      citations
                                    </span>
                                  </div>
                                  {source.doi && (
                                    <a
                                      href={
                                        source.doi.startsWith("http")
                                          ? source.doi
                                          : `https://doi.org/${source.doi}`
                                      }
                                      target="_blank"
                                      rel="noreferrer"
                                      aria-label={`Open source: ${source.title}`}
                                    >
                                      <ExternalLink aria-hidden="true" />
                                    </a>
                                  )}
                                </li>
                              );
                            })}
                          </ol>
                        </div>
                      )}
                  </div>
                </article>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {messages.length === 1 && (
            <div className="assistant-suggestions">
              <span>Try asking</span>
              <div>
                {SUGGESTIONS.map((suggestion) => (
                  <Button
                    key={suggestion}
                    type="button"
                    variant="outline"
                    onClick={() => void sendMessage(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <form
            className="assistant-composer"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage();
            }}
          >
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about Illinois research…"
              disabled={isStreaming}
              aria-label="Question for the research assistant"
            />
            {isStreaming ? (
              <Button
                type="button"
                className="assistant-stop"
                size="icon"
                onClick={stopStreaming}
                aria-label="Stop generating"
              >
                <Square aria-hidden="true" />
              </Button>
            ) : (
              <Button
                type="submit"
                className="assistant-send"
                size="icon"
                disabled={!input.trim()}
                aria-label="Send question"
              >
                <Send aria-hidden="true" />
              </Button>
            )}
          </form>
          <p className="assistant-disclaimer">
            Verify important details in the cited publication.
          </p>
        </section>
      )}
    </aside>
  );
}
