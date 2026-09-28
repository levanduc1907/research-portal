"use client";

import React from "react";
import type { ChatCitationDto } from "@repo/contracts";

interface AssistantMessageContentProps {
  messageId: string;
  text: string;
  sources?: ChatCitationDto[];
  isStreaming?: boolean;
  onCitationClick?: (citationNumber: number) => void;
}

interface InlineNode {
  type: "text" | "bold" | "italic" | "code" | "link" | "citations";
  value?: string;
  text?: string;
  href?: string;
  numbers?: number[];
}

interface TextBlock {
  type: "paragraph";
  text: string;
}

interface HeadingBlock {
  type: "heading";
  level: number;
  text: string;
}

interface ListBlock {
  type: "ul" | "ol";
  items: string[];
}

interface CodeBlock {
  type: "codeblock";
  language: string;
  code: string;
}

type ContentBlock = TextBlock | HeadingBlock | ListBlock | CodeBlock;

function parseBlocks(rawText: string): ContentBlock[] {
  const text = rawText.replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  const blocks: ContentBlock[] = [];
  let currentList: ListBlock | null = null;
  let currentParagraph: string[] = [];
  let inCodeBlock = false;
  let codeBlockLang = "";
  let codeBlockLines: string[] = [];

  const flushParagraph = (): void => {
    if (currentParagraph.length > 0) {
      blocks.push({
        type: "paragraph",
        text: currentParagraph.join("\n").trim(),
      });
      currentParagraph = [];
    }
  };

  const flushList = (): void => {
    if (currentList) {
      blocks.push(currentList);
      currentList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";

    // Code block fences
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        blocks.push({
          type: "codeblock",
          language: codeBlockLang,
          code: codeBlockLines.join("\n"),
        });
        inCodeBlock = false;
        codeBlockLang = "";
        codeBlockLines = [];
        continue;
      } else {
        flushParagraph();
        flushList();
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3).trim();
        codeBlockLines = [];
        continue;
      }
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    // Heading (# ## ###)
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch?.[1] && headingMatch[2]) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      continue;
    }

    // Unordered list item (- or *)
    const ulMatch = line.match(/^(\s*)[-*]\s+(.+)$/);
    if (ulMatch?.[2]) {
      flushParagraph();
      if (!currentList || currentList.type !== "ul") {
        flushList();
        currentList = { type: "ul", items: [] };
      }
      currentList.items.push(ulMatch[2]);
      continue;
    }

    // Ordered list item (1. 2.)
    const olMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
    if (olMatch?.[2]) {
      flushParagraph();
      if (!currentList || currentList.type !== "ol") {
        flushList();
        currentList = { type: "ol", items: [] };
      }
      currentList.items.push(olMatch[2]);
      continue;
    }

    // Regular line in paragraph
    flushList();
    currentParagraph.push(line);
  }

  if (inCodeBlock && codeBlockLines.length > 0) {
    blocks.push({
      type: "codeblock",
      language: codeBlockLang,
      code: codeBlockLines.join("\n"),
    });
  }

  flushParagraph();
  flushList();

  return blocks;
}

function parseInlineTokens(text: string): InlineNode[] {
  // Regex order:
  // 1. Link: [text](url)
  // 2. Citation: [1] or [1, 2]
  // 3. Bold: **text** or __text__
  // 4. Inline code: `text`
  // 5. Italic: *text* or _text_
  const tokenRegex =
    /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))|(\[(\d+(?:\s*(?:,|;)\s*\d+)*)\])|(\*\*|__)(.+?)(?:\6|$)|(`)(.+?)(?:`|$)|(\*|_)([^*\n_]+?)(?:\10|$)/g;

  let lastIndex = 0;
  const nodes: InlineNode[] = [];
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }

    if (match[1] && match[2] && match[3]) {
      nodes.push({ type: "link", text: match[2], href: match[3] });
    } else if (match[4] && match[5]) {
      const numbers = match[5]
        .split(/[,;]/)
        .map((numStr) => parseInt(numStr.trim(), 10))
        .filter((num) => !Number.isNaN(num));
      nodes.push({ type: "citations", numbers });
    } else if (match[6] && match[7]) {
      nodes.push({ type: "bold", value: match[7] });
    } else if (match[8] && match[9]) {
      nodes.push({ type: "code", value: match[9] });
    } else if (match[10] && match[11]) {
      nodes.push({ type: "italic", value: match[11] });
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push({ type: "text", value: text.slice(lastIndex) });
  }

  return nodes;
}

export function AssistantMessageContent({
  text,
  sources,
  isStreaming,
  onCitationClick,
}: AssistantMessageContentProps): React.JSX.Element {
  const blocks = React.useMemo(() => parseBlocks(text), [text]);

  const renderInline = (
    lineText: string,
    isCursorTarget = false,
  ): React.ReactNode => {
    const nodes = parseInlineTokens(lineText);

    return (
      <>
        {nodes.map((node, idx) => {
          const key = `node-${idx}-${node.type}`;
          switch (node.type) {
            case "bold":
              return (
                <strong key={key} className="assistant-strong">
                  {node.value}
                </strong>
              );
            case "italic":
              return <em key={key}>{node.value}</em>;
            case "code":
              return <code key={key}>{node.value}</code>;
            case "link":
              return (
                <a
                  key={key}
                  href={node.href}
                  target="_blank"
                  rel="noreferrer"
                  className="assistant-inline-link"
                >
                  {node.text}
                </a>
              );
            case "citations":
              return (
                <span key={key} className="assistant-citations-group">
                  {node.numbers?.map((citationNum) => {
                    const source = sources?.[citationNum - 1];
                    const tooltip = source
                      ? `[${citationNum}] ${source.title} (${source.year}) · ${source.citedByCount.toLocaleString()} citations`
                      : `Source [${citationNum}]`;

                    return (
                      <button
                        key={`cite-${citationNum}`}
                        type="button"
                        className="assistant-citation-badge"
                        title={tooltip}
                        aria-label={tooltip}
                        onClick={() => onCitationClick?.(citationNum)}
                      >
                        {citationNum}
                      </button>
                    );
                  })}
                </span>
              );
            case "text":
            default:
              return <React.Fragment key={key}>{node.value}</React.Fragment>;
          }
        })}
        {isCursorTarget && isStreaming && (
          <span className="assistant-stream-cursor" aria-hidden="true" />
        )}
      </>
    );
  };

  if (blocks.length === 0 && isStreaming) {
    return (
      <div className="assistant-message-content">
        <p>
          <span className="assistant-stream-cursor" aria-hidden="true" />
        </p>
      </div>
    );
  }

  return (
    <div className="assistant-message-content">
      {blocks.map((block, blockIndex) => {
        const isLastBlock = blockIndex === blocks.length - 1;

        if (block.type === "heading") {
          return (
            <h4
              key={`h-${blockIndex}`}
              className={`assistant-heading level-${block.level}`}
            >
              {renderInline(block.text, isLastBlock)}
            </h4>
          );
        }

        if (block.type === "paragraph") {
          return (
            <p key={`p-${blockIndex}`} className="assistant-paragraph">
              {renderInline(block.text, isLastBlock)}
            </p>
          );
        }

        if (block.type === "ul") {
          return (
            <ul
              key={`ul-${blockIndex}`}
              className="assistant-list is-unordered"
            >
              {block.items.map((item, itemIdx) => {
                const isLastItem =
                  isLastBlock && itemIdx === block.items.length - 1;
                return (
                  <li key={`ul-item-${itemIdx}`}>
                    {renderInline(item, isLastItem)}
                  </li>
                );
              })}
            </ul>
          );
        }

        if (block.type === "ol") {
          return (
            <ol key={`ol-${blockIndex}`} className="assistant-list is-ordered">
              {block.items.map((item, itemIdx) => {
                const isLastItem =
                  isLastBlock && itemIdx === block.items.length - 1;
                return (
                  <li key={`ol-item-${itemIdx}`}>
                    {renderInline(item, isLastItem)}
                  </li>
                );
              })}
            </ol>
          );
        }

        if (block.type === "codeblock") {
          return (
            <pre key={`code-${blockIndex}`} className="assistant-code-block">
              <code>{block.code}</code>
              {isLastBlock && isStreaming && (
                <span className="assistant-stream-cursor" aria-hidden="true" />
              )}
            </pre>
          );
        }

        return null;
      })}
    </div>
  );
}
