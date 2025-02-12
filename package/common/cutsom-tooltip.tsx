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
        <div className="absolute z-10 p-2 mt-2 text-sm color-text-inverse dark:text-[#363B3F] color-bg-default-inverse rounded shadow-lg">
          {content}
        </div>
      )}
    </div>
  );
};

export { CustomTooltip };
