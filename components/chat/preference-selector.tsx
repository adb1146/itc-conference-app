'use client';

import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';

export interface PreferenceOption {
  id: string;
  label: string;
  category: 'interest' | 'role' | 'focus' | 'days';
  value: string;
}

interface PreferenceSelectorProps {
  options: PreferenceOption[];
  onSelectionChange: (selected: PreferenceOption[]) => void;
  onSubmit: (prompt: string) => void;
}

export function PreferenceSelector({ options, onSelectionChange, onSubmit }: PreferenceSelectorProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generatedPrompt, setGeneratedPrompt] = useState('');

  // Group options by category
  const groupedOptions = options.reduce((acc, option) => {
    if (!acc[option.category]) {
      acc[option.category] = [];
    }
    acc[option.category].push(option);
    return acc;
  }, {} as Record<string, PreferenceOption[]>);

  // Category labels
  const categoryLabels = {
    interest: 'Topics of Interest',
    role: 'Your Role',
    focus: 'Session Focus',
    days: 'Conference Days'
  };

  const toggleOption = (optionId: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(optionId)) {
      newSelected.delete(optionId);
    } else {
      newSelected.add(optionId);
    }
    setSelected(newSelected);
  };

  // Generate prompt whenever selection changes
  useEffect(() => {
    const selectedOptions = options.filter(opt => selected.has(opt.id));
    onSelectionChange(selectedOptions);

    // Generate a natural language prompt from selections
    const prompt = generatePromptFromSelections(selectedOptions);
    setGeneratedPrompt(prompt);
  }, [selected, options, onSelectionChange]);

  const generatePromptFromSelections = (selectedOptions: PreferenceOption[]): string => {
    if (selectedOptions.length === 0) {
      return '';
    }

    const interests = selectedOptions.filter(opt => opt.category === 'interest');
    const roles = selectedOptions.filter(opt => opt.category === 'role');
    const focus = selectedOptions.filter(opt => opt.category === 'focus');
    const days = selectedOptions.filter(opt => opt.category === 'days');

    let prompt = "I'm ";

    // Add role
    if (roles.length > 0) {
      prompt += `a ${roles.map(r => r.value).join(' and ')}`;
    }

    // Add interests
    if (interests.length > 0) {
      if (roles.length > 0) prompt += ' interested in ';
      else prompt += 'interested in ';

      if (interests.length === 1) {
        prompt += interests[0].value;
      } else if (interests.length === 2) {
        prompt += `${interests[0].value} and ${interests[1].value}`;
      } else {
        const lastInterest = interests[interests.length - 1];
        const otherInterests = interests.slice(0, -1);
        prompt += `${otherInterests.map(i => i.value).join(', ')}, and ${lastInterest.value}`;
      }
    }

    // Add focus preference
    if (focus.length > 0) {
      prompt += '. I\'m looking for ';
      prompt += focus.map(f => f.value).join(' and ');
    }

    // Add days
    if (days.length > 0) {
      prompt += '. I\'m attending ';
      if (days.length === 3) {
        prompt += 'all three days';
      } else {
        prompt += days.map(d => d.value).join(' and ');
      }
    }

    prompt += '. Build me a personalized agenda.';

    return prompt;
  };

  const handleSubmit = () => {
    if (generatedPrompt) {
      onSubmit(generatedPrompt);
    }
  };

  return (
    <div className="space-y-4 my-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Click to select your preferences (multiple selections allowed):
      </div>

      {Object.entries(groupedOptions).map(([category, categoryOptions]) => (
        <div key={category} className="space-y-2">
          <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            {categoryLabels[category as keyof typeof categoryLabels]}
          </div>
          <div className="flex flex-wrap gap-2">
            {categoryOptions.map(option => (
              <button
                key={option.id}
                onClick={() => toggleOption(option.id)}
                className={`
                  px-3 py-1.5 rounded-full text-sm font-medium transition-all
                  ${selected.has(option.id)
                    ? 'bg-blue-500 text-white ring-2 ring-blue-300 dark:ring-blue-700'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
                  }
                `}
              >
                <span className="flex items-center gap-1">
                  {selected.has(option.id) && <Check className="w-3 h-3" />}
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {selected.size > 0 && (
        <div className="mt-4 space-y-3">
          <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            Generated Prompt (click to edit):
          </div>
          <textarea
            value={generatedPrompt}
            onChange={(e) => setGeneratedPrompt(e.target.value)}
            className="w-full p-3 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
          <button
            onClick={handleSubmit}
            className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
          >
            Send Preferences
          </button>
        </div>
      )}
    </div>
  );
}