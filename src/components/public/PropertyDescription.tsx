import type { ReactNode } from "react";

interface PropertyDescriptionProps {
  content: string;
}

type Block =
  | { type: "heading"; level: 3 | 4; text: string }
  | { type: "list"; items: string[] }
  | { type: "paragraph"; lines: string[] };

/**
 * Renderiza formatação inline segura (**negrito** e *itálico*) sem usar
 * dangerouslySetInnerHTML, evitando qualquer risco de XSS.
 */
function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*\n]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      nodes.push(
        <strong key={key++} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      nodes.push(
        <em key={key++} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    } else {
      nodes.push(token);
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function parseMarkdownBlocks(content: string): Block[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];

  let currentList: string[] | null = null;
  let currentParagraph: string[] | null = null;

  const flushList = () => {
    if (currentList && currentList.length > 0) {
      blocks.push({ type: "list", items: currentList });
    }
    currentList = null;
  };

  const flushParagraph = () => {
    if (currentParagraph && currentParagraph.length > 0) {
      blocks.push({ type: "paragraph", lines: currentParagraph });
    }
    currentParagraph = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushList();
      flushParagraph();
      continue;
    }

    // Qualquer heading Markdown (#, ##, ###) vira <h3> (e ####+ vira <h4>)
    // para preservar a hierarquia semântica SEO da página (h1 -> h2 -> h3).
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushList();
      flushParagraph();
      const level = headingMatch[1].length >= 4 ? 4 : 3;
      blocks.push({
        type: "heading",
        level,
        text: headingMatch[2].trim(),
      });
      continue;
    }

    const listMatch = line.match(/^(?:[-*•])\s+(.+)$/);
    if (listMatch) {
      flushParagraph();
      if (!currentList) currentList = [];
      currentList.push(listMatch[1].trim());
      continue;
    }

    flushList();
    if (!currentParagraph) currentParagraph = [];
    currentParagraph.push(line);
  }

  flushList();
  flushParagraph();

  return blocks;
}

export function PropertyDescription({ content }: PropertyDescriptionProps) {
  const blocks = parseMarkdownBlocks(content);

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted sm:text-base">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          if (block.level === 4) {
            return (
              <h4
                key={index}
                className="pt-1 font-serif text-base font-semibold text-foreground sm:text-lg"
              >
                {renderInline(block.text)}
              </h4>
            );
          }

          return (
            <h3
              key={index}
              className="pt-2 font-serif text-lg font-semibold text-primary sm:text-xl"
            >
              {renderInline(block.text)}
            </h3>
          );
        }

        if (block.type === "list") {
          return (
            <ul
              key={index}
              className="space-y-1.5 pl-5 marker:text-accent list-disc"
            >
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="pl-1">
                  {renderInline(item)}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={index}>
            {block.lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {lineIndex > 0 ? <br /> : null}
                {renderInline(line)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
