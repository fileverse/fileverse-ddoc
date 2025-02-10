import emptyComments from '../../assets/empty-comment.svg';

const EmptyComments = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full color-text-default">
      <img src={emptyComments} alt="empty comments" />
      <div className="text-heading-xsm mt-4">No comments yet</div>
      <p className="text-body-sm">
        Add a comment on the text or in this window
      </p>
    </div>
  );
};

export { EmptyComments };
