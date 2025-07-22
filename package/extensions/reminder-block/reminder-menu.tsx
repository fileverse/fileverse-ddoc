import { forwardRef, useState, useEffect } from 'react';
import {
  Button,
  TextField,
  LucideIcon,
  BottomDrawer,
  IconButton,
  Divider,
  DynamicDropdown,
  DatePicker,
  TimePicker,
} from '@fileverse/ui';
import { format } from 'date-fns';
import { useMediaQuery } from 'usehooks-ts';
import { ReminderMenuProps } from './types';
import uuid from 'react-uuid';
import { useEscapeKey } from '../../hooks/useEscapeKey';

const getTomorrowMorning = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return tomorrow.getTime() - Date.now();
};

const getNextWeekMorning = () => {
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(9, 0, 0, 0);
  return nextWeek.getTime() - Date.now();
};

const QUICK_OPTIONS = [
  { label: 'In 20 minutes', value: 20 * 60 * 1000, icon: 'AlarmClock' },
  { label: 'In 1 hour', value: 60 * 60 * 1000, icon: 'AlarmClock' },
  { label: 'In 3 hours', value: 3 * 60 * 60 * 1000, icon: 'AlarmClock' },
  { label: 'Tomorrow 9 AM', value: getTomorrowMorning(), icon: 'Sunrise' },
  { label: 'Next week 9 AM', value: getNextWeekMorning(), icon: 'Calendar' },
];

export const ReminderMenu = forwardRef<HTMLDivElement, ReminderMenuProps>(
  (
    {
      isOpen,
      onClose,
      onCreateReminder,
      initialReminderTitle,
      setInitialReminderTitle,
      type,
    }: ReminderMenuProps,
    ref,
  ) => {
    const [title, setTitle] = useState<string>(initialReminderTitle || '');
    const [date, setDate] = useState<Date | undefined>(
      new Date(Date.now() + 6 * 60 * 1000),
    );
    const [error, setError] = useState<string>('');
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [use12Hours, setUse12Hours] = useState<boolean>(true);
    const [showBottomDrawer, setShowBottomDrawer] = useState<boolean>(isOpen);

    const handleClose = () => {
      setShowBottomDrawer(false);
      onClose();
    };

    useEffect(() => {
      if (initialReminderTitle) {
        setTitle(initialReminderTitle);
      }
    }, [initialReminderTitle]);

    const createReminder = (timeOffset: number) => {
      if (!title) {
        setError('Please enter a reminder title');
        return;
      }

      const reminder = {
        id: uuid(),
        title,
        timestamp: new Date(Date.now() + timeOffset).toISOString(),
        createdAt: new Date().toISOString(),
        status: 'pending' as const,
      };

      onCreateReminder(reminder, type);
    };

    const handleCreateCustomReminder = () => {
      if (!title) {
        setError('Please enter a reminder title');
        return;
      }

      if (!date) {
        setError('Please enter both date and time');
        return;
      }

      const timestamp = date.getTime();
      if (!timestamp) {
        setError('Invalid date or time format');
        return;
      }

      if (timestamp < Date.now()) {
        setError('Please select a future date and time');
        return;
      }

      const timeUntilReminder = timestamp - Date.now();
      if (timeUntilReminder < 5 * 60 * 1000) {
        setError(
          'Please select a date and time that is at least 5 minutes from now',
        );
        return;
      }

      date.setSeconds(0, 0);

      const reminder = {
        id: uuid(),
        title,
        timestamp: date.toISOString(),
        createdAt: new Date().toISOString(),
        status: 'pending' as const,
      };

      onCreateReminder(reminder, type);
    };

    useEscapeKey(() => {
      onClose();
      setInitialReminderTitle('');
    });

    const content = (
      <div className="px-4 py-2 min-w-[300px] color-bg-default rounded-lg shadow-elevation-3 space-y-3 border color-border-default">
        <div className="flex justify-between items-center">
          <h3 className="text-heading-xsm">Create reminder</h3>
          <IconButton
            icon={'X'}
            variant="ghost"
            size="sm"
            onClick={handleClose}
          />
        </div>

        <TextField
          placeholder="Reminder title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className=""
          autoFocus
        />

        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            {QUICK_OPTIONS.slice(0, -1).map((option) => (
              <Button
                key={option.label}
                variant="ghost"
                size="md"
                className="gap-2 w-full color-bg-secondary hover:color-bg-secondary-hover text-helper-text-sm font-normal"
                onClick={() => createReminder(option.value)}
              >
                <LucideIcon name={option.icon} size="sm" />
                <span>{option.label}</span>
              </Button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="md"
            className="gap-2 w-full color-bg-secondary hover:color-bg-secondary-hover text-helper-text-sm font-normal"
            onClick={() =>
              createReminder(QUICK_OPTIONS[QUICK_OPTIONS.length - 1].value)
            }
          >
            <LucideIcon
              name={QUICK_OPTIONS[QUICK_OPTIONS.length - 1].icon}
              size="sm"
            />
            <span>{QUICK_OPTIONS[QUICK_OPTIONS.length - 1].label}</span>
          </Button>
        </div>

        <hr className="my-2 h-1 w-full" />
        <h3 className="text-heading-xsm">Custom</h3>

        <div className="flex gap-2">
          <DynamicDropdown
            anchorTrigger={
              <TextField
                placeholder="MM/DD/YYYY"
                value={date ? format(date, 'P') : 'MM/DD/YYYY'}
                readOnly
                className="cursor-pointer"
              />
            }
            content={
              <div className="p-2 color-bg-default shadow-elevation-3 rounded-md">
                <DatePicker mode="single" selected={date} onSelect={setDate} />
              </div>
            }
          />

          <div className="flex items-center">
            <DynamicDropdown
              anchorTrigger={
                <TextField
                  placeholder="HH:mm"
                  value={
                    date
                      ? use12Hours
                        ? format(date, 'p')
                        : format(date, 'HH:mm')
                      : 'HH:mm'
                  }
                  readOnly
                  className="cursor-pointer rounded-r-none !w-24"
                />
              }
              content={
                <div className="p-2 color-bg-default shadow-elevation-3 rounded-md">
                  <TimePicker
                    date={date}
                    setDate={setDate}
                    use12Hours={use12Hours}
                  />
                </div>
              }
            />
            <Button
              variant="ghost"
              size="md"
              className="!min-w-fit rounded-l-none rounded-r-md color-bg-tertiary"
              onClick={() => setUse12Hours(!use12Hours)}
            >
              {use12Hours ? '12h' : '24h'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="text-helper-text-sm color-text-danger">{error}</div>
        )}

        <Button
          variant="default"
          size="md"
          className="w-full"
          onClick={handleCreateCustomReminder}
        >
          <span>Create</span>
        </Button>

        <Divider className="my-2 w-full" />

        <div className="flex justify-between items-center pb-1">
          <span className="text-helper-text-sm font-normal color-text-secondary">
            To receive an reminders please allow us to send push notification in
            your browser.
          </span>
        </div>
      </div>
    );

    if (isMobile) {
      return (
        <BottomDrawer
          key="reminder-menu"
          open={showBottomDrawer}
          onOpenChange={handleClose}
          className="w-full shadow-elevation-4"
          contentClassName="w-full h-full !border-none !shadow-elevation-4 !gap-2"
          footerClassName="hidden"
          content={content}
        />
      );
    }

    return (
      <div className="-translate-y-1" ref={ref}>
        {content}
      </div>
    );
  },
);
