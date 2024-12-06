import clx from 'classnames';
import React from 'react';

export const DropdownCategoryTitle = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <div className="text-[.65rem] font-semibold mb-1 uppercase text-neutral-500 px-1.5">
      {children}
    </div>
  );
};

export const DropdownButton = ({
  children,
  isActive,
  onClick,
  disabled,
  className,
}: {
  children: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) => {
  const buttonClass = clx(
    'flex items-center gap-2 p-1.5 text-xs font-medium text-neutral-500 text-left w-full rounded-md border border-transparent transition-all',
    !isActive && !disabled,
    'hover:border-neutral-200 hover:bg-neutral-100',
    isActive && !disabled && 'bg-neutral-200 text-neutral-800',
    disabled && 'text-neutral-300 cursor-not-allowed',
    className,
  );

  return (
    <button className={buttonClass} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
};
