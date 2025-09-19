/**
 * Message Formatter Component
 * Renders chat messages with rich content including clickable links, questions, and formatting
 */

import React from 'react';
import Link from 'next/link';
import DOMPurify from 'dompurify';

interface MessageFormatterProps {
  content: string;
  onSuggestionClick?: (suggestion: string) => void;
}

export function MessageFormatter({
  content,
  onSuggestionClick
}: MessageFormatterProps): React.ReactNode {

  // Process content line by line
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inClickableSection = false;

  // Special sections that contain clickable questions
  const clickableSections = [
    'Quick Questions:',
    'What would you like to know:',
    'Try asking:',
    'Sample questions:',
    'You can ask:',
    'Discover features:',
  ];

  lines.forEach((line, lineIndex) => {
    // Check for clickable section headers
    const isClickableHeader = clickableSections.some(section =>
      line.toLowerCase().includes(section.toLowerCase())
    );

    if (isClickableHeader) {
      inClickableSection = true;
      elements.push(
        <div key={`header-${lineIndex}`} className="font-semibold text-gray-900 mb-2 mt-4">
          {line}
        </div>
      );
      return;
    }

    // Empty line - potential section break
    if (line.trim() === '') {
      inClickableSection = false;
      elements.push(<div key={`break-${lineIndex}`} className="h-2" />);
      return;
    }

    // Process the line content
    const processedLine = processLineContent(line, lineIndex, onSuggestionClick);

    // Check if this is a question in a clickable section
    if (inClickableSection && line.trim().endsWith('?') && onSuggestionClick) {
      const questionText = line.replace(/^[•\-\*\u2022]\s*/, '').trim();
      elements.push(
        <button
          key={`q-${lineIndex}`}
          onClick={() => onSuggestionClick(questionText)}
          className="block w-full text-left px-3 py-2 mb-1 rounded-lg bg-blue-50 hover:bg-blue-100
                   text-blue-700 hover:text-blue-900 transition-colors duration-150
                   border border-blue-200 hover:border-blue-300"
        >
          <span className="flex items-center gap-2">
            <span className="text-blue-500">→</span>
            {questionText}
          </span>
        </button>
      );
    } else {
      elements.push(processedLine);
    }
  });

  return <div className="space-y-1">{elements}</div>;
}

/**
 * Process individual line content for formatting and links
 */
function processLineContent(
  line: string,
  lineIndex: number,
  onSuggestionClick?: (suggestion: string) => void
): React.ReactNode {

  // Handle headers (###, ##, #)
  if (line.startsWith('###')) {
    return (
      <h3 key={`h3-${lineIndex}`} className="font-semibold text-gray-900 text-base mt-3 mb-2">
        {processInlineContent(line.replace(/^###\s*/, ''))}
      </h3>
    );
  }
  if (line.startsWith('##')) {
    return (
      <h2 key={`h2-${lineIndex}`} className="font-bold text-gray-900 text-lg mt-3 mb-2">
        {processInlineContent(line.replace(/^##\s*/, ''))}
      </h2>
    );
  }
  if (line.startsWith('#')) {
    return (
      <h1 key={`h1-${lineIndex}`} className="font-bold text-gray-900 text-xl mt-3 mb-2">
        {processInlineContent(line.replace(/^#\s*/, ''))}
      </h1>
    );
  }

  // Handle numbered lists
  if (line.match(/^\d+\./)) {
    return (
      <div key={`num-${lineIndex}`} className="ml-6 mb-1.5 flex items-start">
        <span className="mr-2 text-gray-600">{line.match(/^\d+/)![0]}.</span>
        <span className="flex-1">{processInlineContent(line.replace(/^\d+\.\s*/, ''))}</span>
      </div>
    );
  }

  // Handle bullet points
  if (line.match(/^[\u2022\-•\*]/)) {
    const bulletContent = line.replace(/^[\u2022\-•\*]\s*/, '');

    // Check if it's a clickable question
    if (bulletContent.endsWith('?') && onSuggestionClick) {
      return (
        <div key={`bullet-${lineIndex}`} className="flex items-start gap-2 mb-1">
          <span className="text-gray-500 mt-1">•</span>
          <button
            onClick={() => onSuggestionClick(bulletContent)}
            className="text-blue-600 hover:text-blue-800 hover:underline text-left"
          >
            {bulletContent}
          </button>
        </div>
      );
    }

    return (
      <div key={`bullet-${lineIndex}`} className="ml-6 mb-1.5 flex items-start">
        <span className="mr-2 text-gray-500">•</span>
        <span className="flex-1">{processInlineContent(bulletContent)}</span>
      </div>
    );
  }

  // Handle key-value pairs (Time:, Location:, Speaker:, etc.)
  if (line.match(/^[A-Z][\w\s]+:/)) {
    const colonIndex = line.indexOf(':');
    return (
      <div key={`kv-${lineIndex}`} className="mb-1.5 text-gray-700">
        <span className="font-semibold text-gray-900">{line.substring(0, colonIndex + 1)}</span>
        {processInlineContent(line.substring(colonIndex + 1))}
      </div>
    );
  }

  // Regular paragraph
  if (line.trim()) {
    return (
      <p key={`p-${lineIndex}`} className="text-gray-700 leading-relaxed">
        {processInlineContent(line)}
      </p>
    );
  }

  return null;
}

/**
 * Process inline content for links, bold, italic, code
 */
function processInlineContent(text: string): React.ReactNode {
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  // First handle markdown links [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^\)]+)\)/g;
  let match;

  const segments: Array<{ type: 'text' | 'link'; content: string; url?: string; start: number; end: number }> = [];

  // Find all links
  while ((match = linkRegex.exec(text)) !== null) {
    segments.push({
      type: 'link',
      content: match[1],
      url: match[2],
      start: match.index,
      end: match.index + match[0].length
    });
  }

  // Sort segments by position
  segments.sort((a, b) => a.start - b.start);

  // Build the result
  let currentIndex = 0;
  segments.forEach((segment) => {
    // Add text before this segment
    if (currentIndex < segment.start) {
      const textBefore = text.substring(currentIndex, segment.start);
      if (textBefore) {
        elements.push(processTextFormatting(textBefore, key++));
      }
    }

    // Add the link
    if (segment.type === 'link' && segment.url) {
      const url = segment.url;

      // Check if it's an internal link
      if (url.startsWith('/')) {
        elements.push(
          <Link
            key={`link-${key++}`}
            href={url}
            className="text-blue-600 hover:text-blue-800 underline font-medium"
          >
            {segment.content}
          </Link>
        );
      } else {
        // External link
        elements.push(
          <a
            key={`link-${key++}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline font-medium"
          >
            {segment.content}
          </a>
        );
      }
    }

    currentIndex = segment.end;
  });

  // Add any remaining text
  if (currentIndex < text.length) {
    const remainingText = text.substring(currentIndex);
    if (remainingText) {
      elements.push(processTextFormatting(remainingText, key++));
    }
  }

  // If no links were found, just process the text for formatting
  if (elements.length === 0) {
    return processTextFormatting(text, 0);
  }

  return <>{elements}</>;
}

/**
 * Process text for bold, italic, code formatting
 */
function processTextFormatting(text: string, baseKey: number): React.ReactNode {
  let processedText = text;
  let key = baseKey;

  // Handle bold **text** or __text__
  processedText = processedText.replace(/\*\*([^*]+)\*\*/g, (match, p1) => {
    return `<strong>${p1}</strong>`;
  });

  // Handle italic *text* or _text_ (but not at start of line - that's a bullet)
  processedText = processedText.replace(/(?<!^)\*([^*]+)\*/g, (match, p1) => {
    return `<em>${p1}</em>`;
  });

  // Handle inline code `code`
  processedText = processedText.replace(/`([^`]+)`/g, (match, p1) => {
    return `<code>${p1}</code>`;
  });

  // If formatting was applied, render as HTML (safely sanitized)
  if (processedText !== text) {
    // Sanitize HTML to prevent XSS attacks
    const sanitizedHTML = DOMPurify.sanitize(processedText, {
      ALLOWED_TAGS: ['strong', 'em', 'code'],
      ALLOWED_ATTR: []
    });

    return (
      <span
        key={`formatted-${key}`}
        dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
        className="inline"
      />
    );
  }

  return text;
}