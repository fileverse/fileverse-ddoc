import { cn } from '@fileverse/ui';
import type { SuggestionType } from '../../types';

interface SuggestionDiffSummaryProps {
  suggestionType?: SuggestionType | null;
  originalContent?: string;
  suggestedContent?: string;
  emptyText?: string;
  className?: string;
}

export const SuggestionDiffSummary = ({
  suggestionType,
  originalContent = '',
  suggestedContent = '',
  emptyText,
  className,
}: SuggestionDiffSummaryProps) => {
  const summaryClassName = cn('text-body-sm break-words', className);

  if (suggestionType === 'add') {
    return (
      <p className={summaryClassName}>
        <span className="font-semibold">Add:</span>{' '}
        <span>&ldquo;{suggestedContent}&rdquo;</span>
      </p>
    );
  }

  if (suggestionType === 'delete') {
    return (
      <p className={summaryClassName}>
        <span className="font-semibold">Delete:</span>{' '}
        <span className="line-through">&ldquo;{originalContent}&rdquo;</span>
      </p>
    );
  }

  if (suggestionType === 'replace') {
    return (
      <p className={summaryClassName}>
        <span className="font-semibold">Replace:</span>{' '}
        <span className="line-through">&ldquo;{originalContent}&rdquo;</span>{' '}
        <span className="font-semibold">with</span>{' '}
        <span>&ldquo;{suggestedContent}&rdquo;</span>
      </p>
    );
  }

  if (suggestionType === 'link') {
    return (
      <p className={summaryClassName}>
        <span className="font-semibold">Add link:</span>{' '}
        <span>&quot;{suggestedContent}&quot;</span>
      </p>
    );
  }

  if (emptyText) {
    return (
      <p className={cn(summaryClassName, 'color-text-secondary italic')}>
        {emptyText}
      </p>
    );
  }

  return null;
};
