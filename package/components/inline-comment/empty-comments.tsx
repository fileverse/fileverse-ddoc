import emptyComments from '../../assets/empty-comment.svg';
import darkEmptyComments from '../../assets/dark-empty-comment.svg';
import { useEffect, useState } from 'react';

const EmptyComments = () => {
  const [theme, setTheme] = useState('light');

  // Function to get theme from localStorage
  const getThemeFromLS = () => {
    const storedTheme = localStorage.getItem('theme');
    return storedTheme ? (storedTheme as 'light' | 'dark') : 'light';
  };

  useEffect(() => {
    // Initial theme setup from localStorage
    setTheme(getThemeFromLS());

    // Listen for storage events to update theme when it changes in other tabs/components
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'theme' && event.newValue) {
        setTheme(event.newValue as 'light' | 'dark');
      }
    };

    // Create a MutationObserver to detect changes to the document's data-theme attribute
    // This helps catch theme changes made by ThemeToggle in the same tab
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'data-theme' &&
          mutation.target === document.documentElement
        ) {
          // When document theme attribute changes, check localStorage again
          setTheme(getThemeFromLS());
        }
      });
    });

    // Start observing the document element for data-theme attribute changes
    observer.observe(document.documentElement, { attributes: true });

    // Set up an interval to periodically check localStorage
    // This is a fallback method to ensure we catch all theme changes
    const intervalId = setInterval(() => {
      const currentTheme = getThemeFromLS();
      if (currentTheme !== theme) {
        setTheme(currentTheme);
      }
    }, 0);

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      observer.disconnect();
      clearInterval(intervalId);
    };
  }, [theme]);

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
