import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Check, Copy } from 'lucide-react';
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { isSafeHttpUrl } from '../../services/api';

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
  copyCodeLabel: string;
  copiedCodeLabel: string;
}

async function copySnippet(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below
    }
  }
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

function MathFormula({
  latex,
  displayMode,
}: {
  latex: string;
  displayMode: boolean;
}) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, {
        displayMode,
        throwOnError: false,
        strict: 'ignore',
        trust: false,
      });
    } catch {
      return null;
    }
  }, [latex, displayMode]);

  if (!html) {
    return (
      <code dir="ltr" className="font-mono text-xs text-neutral-200 italic">
        {latex}
      </code>
    );
  }

  if (displayMode) {
    return (
      <div
        dir="ltr"
        className="my-3 px-4 py-3 rounded-lg border border-neutral-800 bg-[#101010] overflow-x-auto text-neutral-100"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <span
      dir="ltr"
      className="inline-block px-1 align-middle text-neutral-100"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function highlightCodeLine(line: string, keyPrefix: string): ReactNode[] {
  const tokenRegex =
    /(#.*$|\/\/.*$|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|HTTP\/[\d.]+|import|from|export|const|let|var|function|async|await|return|if|else|for|while|def|class|try|except|true|false|null|None|True|False)\b|\b\d+(?:\.\d+)?\b)/gm;

  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = tokenRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(line.slice(lastIndex, match.index));
    }
    const token = match[0];
    idx += 1;

    let className = 'text-neutral-200';
    if (token.startsWith('//') || token.startsWith('#')) {
      className = 'text-neutral-500 italic';
    } else if (token.startsWith('"') || token.startsWith("'")) {
      className = 'text-emerald-300';
    } else if (/^\d/.test(token)) {
      className = 'text-amber-300';
    } else {
      className = 'text-sky-300 font-medium';
    }

    nodes.push(
      <span key={`${keyPrefix}-${idx}`} className={className}>
        {token}
      </span>
    );
    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < line.length) {
    nodes.push(line.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [' '];
}

function CodeBlock({
  language,
  code,
  copyCodeLabel,
  copiedCodeLabel,
}: {
  language: string;
  code: string;
  copyCodeLabel: string;
  copiedCodeLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  async function handleCopy() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    const ok = await copySnippet(code);
    if (ok) {
      setCopied(true);
      timerRef.current = window.setTimeout(() => {
        setCopied(false);
        timerRef.current = null;
      }, 1800);
    }
  }

  const lines = code.split('\n');

  return (
    <div
      dir="ltr"
      className="my-3 rounded-lg border border-neutral-800 bg-[#0b0b0b] overflow-hidden"
    >
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-neutral-800 bg-[#141414]">
        <span className="font-mono text-[11px] text-neutral-400">
          {language || 'text'}
        </span>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" aria-hidden="true" />
              <span className="text-emerald-400">{copiedCodeLabel}</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" aria-hidden="true" />
              <span>{copyCodeLabel}</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-xs font-mono leading-relaxed text-neutral-200">
        <code>
          {lines.map((line, idx) => (
            <div key={`line-${idx}`}>{highlightCodeLine(line, `l${idx}`)}</div>
          ))}
        </code>
      </pre>
    </div>
  );
}

function renderInline(text: string): ReactNode[] {
  const tokens: ReactNode[] = [];
  const pattern =
    /(`[^`]+`|\$\$[^$\n]+\$\$|\$[^\s$](?:[^$\n]*?[^\s$])?\$(?!\d)|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    keyIdx += 1;

    if (token.startsWith('`') && token.endsWith('`')) {
      tokens.push(
        <code
          key={`inline-code-${keyIdx}`}
          dir="ltr"
          className="px-1.5 py-0.5 rounded bg-neutral-800/90 border border-neutral-700/70 font-mono text-[12px] text-emerald-300"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('$$') && token.endsWith('$$')) {
      tokens.push(
        <MathFormula
          key={`inline-display-math-${keyIdx}`}
          latex={token.slice(2, -2).trim()}
          displayMode={false}
        />
      );
    } else if (token.startsWith('$') && token.endsWith('$')) {
      tokens.push(
        <MathFormula
          key={`inline-math-${keyIdx}`}
          latex={token.slice(1, -1).trim()}
          displayMode={false}
        />
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      tokens.push(
        <strong key={`bold-${keyIdx}`} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      tokens.push(
        <em key={`italic-${keyIdx}`} className="italic text-neutral-200">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('[')) {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (linkMatch && isSafeHttpUrl(linkMatch[2])) {
        tokens.push(
          <a
            key={`link-${keyIdx}`}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
          >
            {linkMatch[1]}
          </a>
        );
      } else {
        tokens.push(token);
      }
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push(text.slice(lastIndex));
  }

  return tokens;
}

function isTableSeparatorRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) return false;
  const cells = trimmed
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
  return cells.length > 0 && cells.every((c) => /^:?-{3,}:?$/.test(c));
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

export function MarkdownRenderer({
  content,
  isStreaming = false,
  copyCodeLabel,
  copiedCodeLabel,
}: MarkdownRendererProps) {
  const blocks: ReactNode[] = [];
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  let blockKey = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Fenced Code Block
    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length && lines[i].trim().startsWith('```')) {
        i += 1;
      }
      blockKey += 1;
      blocks.push(
        <CodeBlock
          key={`code-${blockKey}`}
          language={language}
          code={codeLines.join('\n')}
          copyCodeLabel={copyCodeLabel}
          copiedCodeLabel={copiedCodeLabel}
        />
      );
      continue;
    }

    // 2. Display Math Block $$ ... $$ (KaTeX rendered)
    if (trimmed.startsWith('$$')) {
      let mathText = '';
      if (trimmed.endsWith('$$') && trimmed.length > 4) {
        mathText = trimmed.slice(2, -2).trim();
        i += 1;
      } else {
        const mathLines: string[] = [];
        const firstRest = trimmed.slice(2).trim();
        if (firstRest) mathLines.push(firstRest);
        i += 1;
        while (i < lines.length && !lines[i].trim().endsWith('$$')) {
          mathLines.push(lines[i]);
          i += 1;
        }
        if (i < lines.length) {
          const lastPart = lines[i].trim().slice(0, -2).trim();
          if (lastPart) mathLines.push(lastPart);
          i += 1;
        }
        mathText = mathLines.join(' ');
      }
      blockKey += 1;
      blocks.push(
        <MathFormula key={`math-${blockKey}`} latex={mathText} displayMode={true} />
      );
      continue;
    }

    // 3. Markdown Table
    if (
      trimmed.includes('|') &&
      i + 1 < lines.length &&
      isTableSeparatorRow(lines[i + 1])
    ) {
      const headers = parseTableRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().includes('|') && lines[i].trim() !== '') {
        rows.push(parseTableRow(lines[i]));
        i += 1;
      }
      blockKey += 1;
      blocks.push(
        <div
          key={`table-${blockKey}`}
          className="my-3 overflow-x-auto rounded-lg border border-neutral-800 bg-[#111111]"
        >
          <table className="w-full text-start border-collapse text-xs sm:text-sm tabular-nums">
            <thead>
              <tr className="border-b border-neutral-800 bg-[#171717]">
                {headers.map((head, hIdx) => (
                  <th
                    key={`th-${hIdx}`}
                    className="px-3.5 py-2.5 text-start font-semibold text-neutral-100 whitespace-nowrap"
                  >
                    {renderInline(head)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80">
              {rows.map((row, rIdx) => (
                <tr key={`tr-${rIdx}`} className="hover:bg-neutral-900/60 transition-colors">
                  {headers.map((_, cIdx) => (
                    <td
                      key={`td-${rIdx}-${cIdx}`}
                      className="px-3.5 py-2.5 text-neutral-300"
                    >
                      {renderInline(row[cIdx] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // 4. Semantic Headings
    const headingMatch = /^(#{1,4})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      blockKey += 1;
      if (level <= 2) {
        blocks.push(
          <h2 key={`h-${blockKey}`} className="text-base font-semibold text-white mt-3 mb-1.5">
            {renderInline(text)}
          </h2>
        );
      } else if (level === 3) {
        blocks.push(
          <h3 key={`h-${blockKey}`} className="text-sm font-semibold text-neutral-100 mt-2.5 mb-1">
            {renderInline(text)}
          </h3>
        );
      } else {
        blocks.push(
          <h4 key={`h-${blockKey}`} className="text-sm font-medium text-neutral-200 mt-2 mb-1">
            {renderInline(text)}
          </h4>
        );
      }
      i += 1;
      continue;
    }

    // 5. Blockquotes
    if (trimmed.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        quoteLines.push(lines[i].trim().slice(2));
        i += 1;
      }
      blockKey += 1;
      blocks.push(
        <blockquote
          key={`quote-${blockKey}`}
          className="my-2.5 px-3.5 py-2 rounded-lg border border-neutral-800 bg-neutral-900/60 text-neutral-300 text-sm"
        >
          {renderInline(quoteLines.join(' '))}
        </blockquote>
      );
      continue;
    }

    // 6. Unordered Lists
    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i += 1;
      }
      blockKey += 1;
      blocks.push(
        <ul key={`ul-${blockKey}`} className="my-2 space-y-1.5 list-disc ps-5 text-neutral-200">
          {items.map((item, idx) => (
            <li key={`li-${idx}`}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // 7. Ordered Lists
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i += 1;
      }
      blockKey += 1;
      blocks.push(
        <ol key={`ol-${blockKey}`} className="my-2 space-y-1.5 list-decimal ps-5 text-neutral-200">
          {items.map((item, idx) => (
            <li key={`oli-${idx}`}>{renderInline(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // 8. Blank line
    if (trimmed === '') {
      i += 1;
      continue;
    }

    // 9. Paragraph
    const paraLines: string[] = [lines[i]];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('$$') &&
      !/^#{1,4}\s+.+$/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith('> ') &&
      !/^[-*]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !(
        lines[i].trim().includes('|') &&
        i + 1 < lines.length &&
        isTableSeparatorRow(lines[i + 1])
      )
    ) {
      paraLines.push(lines[i]);
      i += 1;
    }
    blockKey += 1;
    blocks.push(
      <p key={`p-${blockKey}`} className="my-1.5 text-neutral-200 leading-relaxed whitespace-pre-wrap">
        {renderInline(paraLines.join('\n'))}
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {blocks.map((block, idx) => (
        <Fragment key={idx}>{block}</Fragment>
      ))}
      {isStreaming && (
        <span
          aria-hidden="true"
          className="inline-block w-1.5 h-4 align-middle ms-1 bg-emerald-400 animate-pulse"
        />
      )}
    </div>
  );
}
