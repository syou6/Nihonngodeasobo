import React, { useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { Award, Target } from 'lucide-react';
import type { JapaneseFeedback } from '../../types';

interface FeedbackCardProps {
  feedback: JapaneseFeedback;
}

export const FeedbackCard: React.FC<FeedbackCardProps> = ({ feedback }) => {
  const h2CountRef = useRef(0);

  const getJlptColor = (level: string) => {
    const colors: Record<string, string> = {
      'N5': 'bg-gray-100 text-gray-700',
      'N4': 'bg-blue-100 text-blue-700',
      'N3': 'bg-green-100 text-green-700',
      'N2': 'bg-yellow-100 text-yellow-700',
      'N1': 'bg-purple-100 text-purple-700',
    };
    return colors[level] || 'bg-gray-100 text-gray-700';
  };

  // Reset counter on each render
  h2CountRef.current = 0;

  const markdownComponents: Components = {
    h2: ({ children }) => {
      h2CountRef.current += 1;
      const isFirst = h2CountRef.current === 1;
      return (
        <h2
          style={{
            fontSize: '1.125rem',
            fontWeight: 700,
            color: '#111827',
            marginTop: isFirst ? '0' : '2rem',
            marginBottom: '1rem',
            paddingTop: isFirst ? '0' : '1.5rem',
            borderTop: isFirst ? 'none' : '2px solid #e5e7eb',
          }}
        >
          {children}
        </h2>
      );
    },
    // GFM tables (Vocabulary Builder) — render as a real, scrollable table.
    table: ({ children }) => (
      <div className="overflow-x-auto my-3">
        <table className="w-full text-sm border-collapse">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-indigo-50">{children}</thead>,
    th: ({ children }) => (
      <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-800 whitespace-nowrap">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border border-gray-200 px-3 py-2 text-gray-700 align-top">{children}</td>
    ),
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 sm:p-6 space-y-4">
      {/* Header with Level */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full flex items-center justify-center bg-indigo-100">
            <Award className="w-8 h-8 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">AI Feedback</h3>
            <div className="flex items-center gap-2">
              <span className={`inline-block px-2 py-0.5 rounded-full text-sm font-medium ${getJlptColor(feedback.jlptLevel)}`}>
                {feedback.jlptLevel}
              </span>
              {feedback.targetLevel && (
                <>
                  <Target className="w-3 h-3 text-gray-400" />
                  <span className={`inline-block px-2 py-0.5 rounded-full text-sm font-medium ${getJlptColor(feedback.targetLevel)}`}>
                    → {feedback.targetLevel}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Markdown Content */}
      <div className="bg-white rounded-xl p-4 sm:p-6 prose prose-sm sm:prose max-w-none
        prose-headings:text-gray-900 prose-headings:font-bold
        prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2
        prose-h4:text-sm prose-h4:mt-3 prose-h4:mb-1
        prose-p:text-gray-700 prose-p:leading-relaxed prose-p:my-3
        prose-ul:my-3 prose-li:my-1
        prose-strong:text-gray-900
        prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-indigo-600 prose-code:text-sm
        prose-blockquote:border-l-4 prose-blockquote:border-indigo-300 prose-blockquote:bg-indigo-50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:my-3
      ">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {feedback.markdownContent}
        </ReactMarkdown>
      </div>
    </div>
  );
};
