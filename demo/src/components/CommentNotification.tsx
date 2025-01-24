// TODO: Create the same component for the comment notification in the consumer app
import { cn } from '@fileverse/ui';
import { useEffect, useState } from 'react';

interface CommentNotificationProps {
    className?: string;
}

const CommentNotification = ({ className }: CommentNotificationProps) => {
    const [newCommentsCount, setNewCommentsCount] = useState(0);

    // Add function to update count
    const updateCommentCount = () => {
        const storedComments = localStorage.getItem('viewedComments');
        const viewedComments = storedComments ? JSON.parse(storedComments) : [];
        const allComments = JSON.parse(localStorage.getItem('initialComments') || '[]');
        const newComments = allComments.filter((comment: { id: string }) =>
            !viewedComments.includes(comment.id)
        );
        setNewCommentsCount(newComments.length);
    };

    // Run on mount and set up localStorage change listener
    useEffect(() => {
        updateCommentCount();

        // Listen for storage changes
        const handleStorageChange = () => {
            updateCommentCount();
        };

        window.addEventListener('storage', handleStorageChange);

        // Custom event listener for local updates
        window.addEventListener('commentsUpdated', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('commentsUpdated', handleStorageChange);
        };
    }, []);

    if (newCommentsCount === 0) return null;

    return (
        <div
            className={cn(
                'flex items-center justify-center',
                'w-4 h-4 rounded-full',
                'color-bg-brand color-text-default',
                'text-[10px] font-medium',
                className
            )}
        >
            {newCommentsCount > 9 ? '9+' : newCommentsCount}
        </div>
    );
};

export { CommentNotification }; 