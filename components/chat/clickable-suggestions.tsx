/**
 * Clickable Suggestions Component
 * Makes question suggestions in chat messages clickable
 */

import React from 'react';

interface ClickableSuggestionsProps {
  content: string;
  onSuggestionClick: (suggestion: string) => void;
}

export function parseAndRenderClickableSuggestions(
  content: string,
  onSuggestionClick: (suggestion: string) => void
): React.ReactNode {
  // Pattern to match questions in lists
  // Matches lines that look like questions with ? at the end
  const questionPatterns = [
    /^([•\-\*\u2022])\s*(.+\?)\s*$/gm,  // Bullet points with questions
    /^\s*(.+\?)\s*$/gm,  // Standalone questions
  ];

  // Pattern to match URLs and links
  const urlPattern = /\[([^\]]+)\]\(([^\)]+)\)/g;
  const sessionPattern = /\/agenda\/session\/cmffpi[a-z0-9]+/gi;
  const locationPattern = /\/locations\?location=[^)]+/gi;

  // Special sections that contain clickable questions
  const clickableSections = [
    'Quick Questions:',
    'What would you like to know:',
    'Try asking:',
    'Sample questions:',
    'You can ask:',
    'Questions you might have:',
    'Common questions:',
  ];

  // Split content into lines
  const lines = content.split('\n');
  const result: React.ReactNode[] = [];
  let inClickableSection = false;
  let currentSection: React.ReactNode[] = [];

  lines.forEach((line, index) => {
    // Check if we're entering a clickable section
    const isClickableHeader = clickableSections.some(section =>
      line.toLowerCase().includes(section.toLowerCase())
    );

    if (isClickableHeader) {
      inClickableSection = true;
      result.push(
        <div key={`header-${index}`} className="font-semibold text-gray-900 mb-2">
          {line}
        </div>
      );
      return;
    }

    // Check if line is empty (section break)
    if (line.trim() === '') {
      if (inClickableSection && currentSection.length > 0) {
        result.push(
          <div key={`section-${index}`} className="space-y-1 mb-3">
            {currentSection}
          </div>
        );
        currentSection = [];
      }
      inClickableSection = false;
      result.push(<div key={`break-${index}`} className="h-2" />);
      return;
    }

    // Process questions in clickable sections
    if (inClickableSection) {
      // Check if this line is a question
      const questionMatch = line.match(/^[\s•\-\*\u2022]*(.+\?)\s*$/);

      if (questionMatch) {
        const question = questionMatch[1].trim();
        currentSection.push(
          <button
            key={`q-${index}`}
            onClick={() => onSuggestionClick(question)}
            className="block w-full text-left px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100
                     text-blue-700 hover:text-blue-900 transition-colors duration-150
                     border border-blue-200 hover:border-blue-300"
          >
            <span className="flex items-center gap-2">
              <span className="text-blue-500">→</span>
              {question}
            </span>
          </button>
        );
      } else if (line.trim()) {
        // Non-question line in clickable section
        currentSection.push(
          <div key={`text-${index}`} className="text-gray-700 px-3">
            {line}
          </div>
        );
      }
    } else {
      // Regular content - check if it contains inline questions we should make clickable
      const inlineQuestionMatch = line.match(/^[\s•\-\*\u2022]*(.+\?)\s*$/);

      // Only make questions clickable if they're in a list format
      if (inlineQuestionMatch && line.match(/^[\s]*[•\-\*\u2022]/)) {
        const question = inlineQuestionMatch[1].trim();
        result.push(
          <div key={`inline-${index}`} className="flex items-start gap-2 mb-1">
            <span className="text-gray-500 mt-1">•</span>
            <button
              onClick={() => onSuggestionClick(question)}
              className="text-blue-600 hover:text-blue-800 hover:underline text-left"
            >
              {question}
            </button>
          </div>
        );
      } else {
        // Regular text line
        result.push(
          <div key={`regular-${index}`} className="text-gray-700">
            {line}
          </div>
        );
      }
    }
  });

  // Add any remaining section
  if (currentSection.length > 0) {
    result.push(
      <div key="final-section" className="space-y-1 mb-3">
        {currentSection}
      </div>
    );
  }

  return <div className="space-y-1">{result}</div>;
}

export const ClickableSuggestions: React.FC<ClickableSuggestionsProps> = ({
  content,
  onSuggestionClick
}) => {
  return (
    <>
      {parseAndRenderClickableSuggestions(content, onSuggestionClick)}
    </>
  );
};