import { formatDistanceToNow, isAfter, subDays } from 'date-fns';

export const nameFormatter = (username: string) => {
  if (!username) return username;

  if (username.length > 20) {
    return username.slice(0, 5) + '...' + username.slice(username.length - 5);
  }

  return username;
};

export const dateFormatter = (date: Date) => {
  const oneDayAgo = subDays(new Date(), 1);

  // Show relative time if less than 24 hours ago
  if (isAfter(date, oneDayAgo)) {
    return formatDistanceToNow(date, { addSuffix: true });
  }

  // Otherwise use the existing format
  return (
    <>
      {date.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })}
      <span>&#8226;</span>
      {date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })}
    </>
  );
};
