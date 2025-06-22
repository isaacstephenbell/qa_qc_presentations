import React from 'react';
import { diffWords } from 'diff';

type DiffViewProps = {
  original: string;
  corrected: string;
};

const DiffLine = ({ label, parts }: { label: string, parts: ReturnType<typeof diffWords> }) => {
  const isOriginal = label === 'Original';

  return (
    <div className="flex items-start">
      <span className={`text-xs font-semibold w-20 flex-shrink-0 pt-1 ${isOriginal ? 'text-red-600' : 'text-green-600'}`}>{label}</span>
      <p className="text-base leading-relaxed border rounded-md p-2 w-full bg-gray-50/50">
        "
        {parts.map((part, index) => {
          const style: React.CSSProperties = {
            backgroundColor: 'transparent',
            textDecoration: 'none'
          };

          if (isOriginal) {
            if (part.removed) style.backgroundColor = 'rgba(254, 226, 226, 1)'; // bg-red-100
            if (part.added) return null;
          } else { // Corrected
            if (part.added) style.backgroundColor = 'rgba(220, 252, 231, 1)'; // bg-green-100
            if (part.removed) return null;
          }

          return <span key={index} style={style}>{part.value}</span>;
        })}
        "
      </p>
    </div>
  );
};

export default function DiffView({ original, corrected }: DiffViewProps) {
  const diffs = diffWords(original, corrected);

  return (
    <div className="space-y-2">
      <DiffLine label="Original" parts={diffs} />
      <DiffLine label="Suggested" parts={diffs} />
    </div>
  );
}
