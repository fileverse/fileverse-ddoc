import { ReactNode, FC, useState } from 'react';

interface CustomTooltipProps {
  content: ReactNode;
  children: ReactNode;
}

const CustomTooltip: FC<CustomTooltipProps> = ({ content, children }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className="absolute z-10 p-2 mt-2 text-sm text-white bg-gray-800 rounded shadow-lg">
          {content}
        </div>
      )}
    </div>
  );
};

export default CustomTooltip;
