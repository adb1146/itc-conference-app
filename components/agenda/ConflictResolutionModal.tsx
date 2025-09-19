'use client';

import { useState } from 'react';
import { X, AlertTriangle, Clock, MapPin, CheckCircle, Calendar } from 'lucide-react';
import { ScheduleItem } from '@/lib/tools/schedule/types';

interface Conflict {
  session1: ScheduleItem;
  session2: ScheduleItem;
  timeOverlap: string;
}

interface ConflictResolutionModalProps {
  conflicts: Conflict[];
  onResolve: (resolutions: { keep: string; alternative: string }[]) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function ConflictResolutionModal({
  conflicts,
  onResolve,
  onClose,
  isOpen
}: ConflictResolutionModalProps) {
  const [resolutions, setResolutions] = useState<{ [key: number]: string }>({});
  const [showAlternatives, setShowAlternatives] = useState<{ [key: number]: boolean }>({});

  if (!isOpen) return null;

  const handleSelection = (conflictIndex: number, sessionId: string) => {
    setResolutions(prev => ({
      ...prev,
      [conflictIndex]: sessionId
    }));
  };

  const handleResolveAll = () => {
    const resolutionList = conflicts.map((conflict, index) => {
      const keepId = resolutions[index] || conflict.session1.id;
      const alternativeId = keepId === conflict.session1.id ? conflict.session2.id : conflict.session1.id;
      return { keep: keepId, alternative: alternativeId };
    });
    onResolve(resolutionList);
    onClose();
  };

  const allResolved = Object.keys(resolutions).length === conflicts.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-white rounded-t-xl sm:rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] sm:max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0" />
              <div>
                <h2 className="text-lg sm:text-2xl font-bold">Schedule Conflicts</h2>
                <p className="text-xs sm:text-sm text-orange-100 mt-0.5 sm:mt-1">
                  {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''} need{conflicts.length === 1 ? 's' : ''} your attention
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Conflicts List */}
        <div className="overflow-y-auto max-h-[55vh] sm:max-h-[60vh] p-4 sm:p-6 space-y-4 sm:space-y-6">
          {conflicts.map((conflict, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <span className="text-xs sm:text-sm font-medium text-gray-500">Conflict {index + 1}</span>
                <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                  {conflict.timeOverlap}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Session 1 */}
                <div
                  className={`border-2 rounded-lg p-3 sm:p-4 cursor-pointer transition-all ${
                    resolutions[index] === conflict.session1.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleSelection(index, conflict.session1.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-sm sm:text-base text-gray-900 flex-1 pr-2">
                      {conflict.session1.item.title}
                    </h3>
                    {resolutions[index] === conflict.session1.id && (
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                    )}
                  </div>

                  {conflict.session1.source === 'user-favorite' && (
                    <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full mb-2">
                      Your Favorite
                    </span>
                  )}

                  <div className="space-y-1 text-xs sm:text-sm text-gray-600">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span>{conflict.session1.time} - {conflict.session1.endTime}</span>
                    </div>
                    {conflict.session1.item.location && (
                      <div className="flex items-center gap-1 sm:gap-2">
                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="truncate">{conflict.session1.item.location}</span>
                      </div>
                    )}
                  </div>

                  {conflict.session1.item.description && (
                    <p className="text-xs sm:text-sm text-gray-600 mt-2 line-clamp-2">
                      {conflict.session1.item.description}
                    </p>
                  )}
                </div>

                {/* Session 2 */}
                <div
                  className={`border-2 rounded-lg p-3 sm:p-4 cursor-pointer transition-all ${
                    resolutions[index] === conflict.session2.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleSelection(index, conflict.session2.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-sm sm:text-base text-gray-900 flex-1 pr-2">
                      {conflict.session2.item.title}
                    </h3>
                    {resolutions[index] === conflict.session2.id && (
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                    )}
                  </div>

                  {conflict.session2.source === 'user-favorite' && (
                    <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full mb-2">
                      Your Favorite
                    </span>
                  )}

                  <div className="space-y-1 text-xs sm:text-sm text-gray-600">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span>{conflict.session2.time} - {conflict.session2.endTime}</span>
                    </div>
                    {conflict.session2.item.location && (
                      <div className="flex items-center gap-1 sm:gap-2">
                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="truncate">{conflict.session2.item.location}</span>
                      </div>
                    )}
                  </div>

                  {conflict.session2.item.description && (
                    <p className="text-xs sm:text-sm text-gray-600 mt-2 line-clamp-2">
                      {conflict.session2.item.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Alternative Times (if available) */}
              <div className="mt-3 sm:mt-4">
                <button
                  onClick={() => setShowAlternatives(prev => ({ ...prev, [index]: !prev[index] }))}
                  className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {showAlternatives[index] ? 'Hide' : 'Show'} alternative times →
                </button>

                {showAlternatives[index] && (
                  <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs sm:text-sm text-blue-900 font-medium mb-1 sm:mb-2">
                      Alternative Options:
                    </p>
                    <ul className="space-y-1 text-xs sm:text-sm text-blue-700">
                      <li className="flex items-center gap-1 sm:gap-2">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        Session recording will be available after the conference
                      </li>
                      <li className="flex items-center gap-1 sm:gap-2">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        Similar session "Advanced Automation" on Day 2 at 2:00 PM
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 sm:p-6 bg-gray-50">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
              {allResolved
                ? '✓ All conflicts resolved'
                : `Select your preferred session for each conflict (${Object.keys(resolutions).length}/${conflicts.length} resolved)`
              }
            </p>
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 sm:px-5 py-2 sm:py-2.5 border border-gray-300 text-gray-700 text-sm sm:text-base rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveAll}
                className={`flex-1 sm:flex-none px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base rounded-lg transition-colors ${
                  allResolved
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-orange-600 text-white hover:bg-orange-700'
                }`}
              >
                {allResolved ? 'Apply Resolutions' : 'Resolve with Defaults'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}