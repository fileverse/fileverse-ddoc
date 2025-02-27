import emptyComments from '../../assets/empty-comment.svg';
import darkEmptyComments from '../../assets/dark-empty-comment.svg';
import { useTheme } from '@fileverse/ui';

const EmptyComments = () => {
  const { theme } = useTheme();

  return (
    <div className="flex flex-col items-center justify-center h-full color-text-default">
      <img
        src={theme === 'dark' ? darkEmptyComments : emptyComments}
        alt="empty comments"
      />
      <div className="text-heading-xsm mt-4">No comments yet</div>
      <p className="text-body-sm color-text-secondary">
        Add a comment on the text or in this window
      </p>
    </div>
  );
};

export { EmptyComments };
