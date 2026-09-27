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
import { BlockILogo } from "./illinois-logo";

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

export function AiAssistant(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const conversationIdRef = useRef<string>(crypto.randomUUID());

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
    },
    [],
  );

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
    if (!query || isStreaming) return;

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
    setMessages([INITIAL_MESSAGE]);
  };

  return (
    <aside className="assistant-shell">
      {!isOpen && (
        <Button
          type="button"
          className="assistant-trigger"
          onClick={() => setIsOpen(true)}
          aria-expanded="false"
          aria-controls="research-assistant-panel"
        >
          <span className="assistant-trigger-mark" aria-hidden="true">
            <BlockILogo withOutline={false} />
          </span>
          <span>
            <small>Illinois Research</small>
            Ask the assistant
          </span>
          <MessageSquareText aria-hidden="true" />
        </Button>
      )}

      {isOpen && (
        <section
          id="research-assistant-panel"
          className="assistant-panel"
          role="dialog"
          aria-label="Illinois research assistant"
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
              >
                <RotateCcw aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                aria-label="Minimize research assistant"
                title="Minimize"
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
                    <p>
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
                      ) : (
                        visibleText
                      )}
                      {message.phase === "generating" && message.text && (
                        <span
                          className="assistant-stream-cursor"
                          aria-hidden="true"
                        />
                      )}
                    </p>
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
                    {!!message.sources?.length && !message.isStreaming && (
                      <div className="assistant-sources">
                        <h3>
                          <BookOpen aria-hidden="true" /> Sources
                        </h3>
                        <ol>
                          {message.sources.map((source) => (
                            <li key={source.paperId}>
                              <div>
                                <strong>{source.title}</strong>
                                <span>
                                  {source.year} · {source.citedByCount}{" "}
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
                          ))}
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
