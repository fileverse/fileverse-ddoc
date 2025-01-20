import { formatDistanceToNow, isAfter, subDays } from 'date-fns';

export const nameFormatter = (address: string) => {
  const isEthereumAddress = /^0x[a-fA-F0-9]{40}$/.test(address);

  if (!address || !isEthereumAddress) return address;

  return address.slice(0, 5) + '...' + address.slice(address.length - 5);
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
