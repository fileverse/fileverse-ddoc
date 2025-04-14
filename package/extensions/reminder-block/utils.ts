// Add these helper functions at the top level
export const formatDate = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4, 8)}`;
};

export const formatTime = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
};

export const parseCustomDateTime = (
  dateStr: string,
  timeStr: string,
): number | null => {
  try {
    const [day, month, year] = dateStr.split('.').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);

    if (!day || !month || !year || isNaN(hours) || isNaN(minutes)) {
      return null;
    }

    const date = new Date(year, month - 1, day, hours, minutes);
    return date.getTime();
  } catch {
    return null;
  }
};

export const formatDateForReminder = (timestamp: number) => {
  const date = new Date(timestamp);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // If it's today
  if (date.toDateString() === today.toDateString()) {
    return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  // If it's tomorrow
  else if (date.toDateString() === tomorrow.toDateString()) {
    return `Tomorrow, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  // If it's another date
  else {
    return `${date.toLocaleDateString([], {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })}, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
};
