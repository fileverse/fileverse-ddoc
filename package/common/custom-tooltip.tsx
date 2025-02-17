import { ReactNode, useState } from 'react';

interface CustomTooltipProps {
  content: ReactNode;
  children: ReactNode;
}

const CustomTooltip = ({ content, children }: CustomTooltipProps) => {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className="absolute z-10 p-2 mt-2 text-sm color-text-inverse dark:bg-[#000] color-bg-default-inverse rounded shadow-lg animate-in fade-in-10 zoom-in-75">
          {content}
        </div>
      )}
    </div>
  );
};

export { CustomTooltip };
