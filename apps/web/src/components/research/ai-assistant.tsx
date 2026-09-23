"use client";

import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ExternalLink,
  MessageSquareText,
  RotateCcw,
  Send,
  Square,
  X,
} from "lucide-react";
import type { ChatCitationDto } from "@repo/contracts";
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
        message.isStreaming ? { ...message, isStreaming: false } : message,
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
      { id: assistantId, sender: "assistant", text: "", isStreaming: true },
    ]);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    let receivedText = false;

    try {
      for await (const chunk of researchApi.streamAssistant(
        query,
        controller.signal,
      )) {
        if (chunk.token) receivedText = true;
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  text: message.text + (chunk.token ?? ""),
                  sources: chunk.sources ?? message.sources,
                  route: chunk.route ?? message.route,
                  isStreaming: !chunk.done,
                }
              : message,
          ),
        );
      }
    } catch (error: unknown) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  text: receivedText
                    ? message.text
                    : "The research assistant is temporarily unavailable. Please try again.",
                  isStreaming: false,
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
                <BlockILogo withOutline={false} />
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
                aria-label="Close research assistant"
              >
                <X aria-hidden="true" />
              </Button>
            </div>
          </header>

          <div className="assistant-messages" aria-live="polite">
            {messages.map((message) => (
              <article
                key={message.id}
                className={`assistant-message is-${message.sender}`}
              >
                {message.sender === "assistant" && (
                  <span className="assistant-avatar" aria-hidden="true">
                    <BlockILogo withOutline={false} />
                  </span>
                )}
                <div className="assistant-message-body">
                  <p>
                    {message.text}
                    {message.isStreaming && (
                      <span
                        className="assistant-stream-cursor"
                        aria-hidden="true"
                      />
                    )}
                  </p>
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
                                {source.year} · {source.citedByCount} citations
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
            ))}
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
