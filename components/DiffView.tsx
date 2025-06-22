import React from 'react';
import { diffWords } from 'diff';

type Props = {
  original: string | undefined;
  suggestion: string | undefined;
  type: 'original' | 'suggestion';
};

export default function DiffView({ original, suggestion, type }: Props) {
  const safeOriginal = (original || '').trim();
  const safeSuggestion = (suggestion || '').trim();
  
  const diffs = diffWords(safeOriginal, safeSuggestion);

  return (
    <p className="text-base leading-relaxed">
      "
      {diffs.map((part, index) => {
        const isOriginalView = type === 'original';
        
        if (part.added && isOriginalView) {
          return null; // Hide additions in original view
        }
        
        if (part.removed && !isOriginalView) {
          return null; // Hide removals in suggestion view
        }

        const style: React.CSSProperties = {
          backgroundColor: part.added ? 'rgba(220, 252, 231, 1)' : 'transparent',
          color: part.removed ? 'rgba(153, 27, 27, 1)' : 'inherit',
          textDecoration: part.removed ? 'line-through' : 'none',
          padding: '1px',
          borderRadius: '3px',
          fontWeight: part.added ? '600' : 'normal',
        };

        return <span key={index} style={style}>{part.value}</span>;
      })}
      "
    </p>
  );
}
