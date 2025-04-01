import { useState } from 'react';
import {
  Button,
  TextField,
  LucideIcon,
  BottomDrawer,
  IconButton,
  Divider,
} from '@fileverse/ui';
import { useMediaQuery } from 'usehooks-ts';
import { ReminderMenuProps } from './types';
import uuid from 'react-uuid';
import React from 'react';
import { formatTime, parseCustomDateTime } from './utils';
import { formatDate } from './utils';

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

export const ReminderMenu = ({
  editor,
  isOpen,
  onClose,
  onCreateReminder,
}: ReminderMenuProps) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [error, setError] = useState('');
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [is24hFormat, setIs24hFormat] = useState(true);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDate(e.target.value);
    setDate(formatted);
    setError('');
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatTime(e.target.value);
    setTime(formatted);
    setError('');
  };

  const createReminder = (timeOffset: number) => {
    if (!title) {
      setError('Please enter a reminder title');
      return;
    }

    const reminder = {
      id: uuid(),
      title,
      timestamp: Date.now() + timeOffset,
      createdAt: Date.now(),
      status: 'pending' as const,
    };

    onCreateReminder(reminder);
  };

  const handleCreateCustomReminder = () => {
    if (!title) {
      setError('Please enter a reminder title');
      return;
    }

    if (!date || !time) {
      setError('Please enter both date and time');
      return;
    }

    const timestamp = parseCustomDateTime(date, time);
    if (!timestamp) {
      setError('Invalid date or time format');
      return;
    }

    if (timestamp <= Date.now()) {
      setError('Please select a future date and time');
      return;
    }

    const reminder = {
      id: uuid(),
      title,
      timestamp,
      createdAt: Date.now(),
      status: 'pending' as const,
    };

    onCreateReminder(reminder);
  };

  const content = (
    <div className="px-4 py-2 min-w-[300px] color-bg-default rounded-lg shadow-elevation-3 space-y-3 border color-border-default">
      <div className="flex justify-between items-center">
        <h3 className="text-heading-xsm">Create reminder</h3>
        <IconButton icon={'X'} variant="ghost" size="sm" onClick={onClose} />
      </div>

      <TextField
        placeholder="Reminder title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className=""
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

      <Divider className="my-2 w-full" />
      <h3 className="text-heading-xsm">Custom</h3>

      <div className="flex gap-2">
        <TextField
          type="text"
          placeholder="DD.MM.YYY"
          value={date}
          onChange={handleDateChange}
          className=""
          pattern="\d{2}\.\d{2}\.\d{4}"
          inputMode="numeric"
          maxLength={10}
          style={
            {
              '--input-padding': '8px',
              '--input-height': '36px',
            } as React.CSSProperties
          }
        />

        <div className="flex items-center text-body-sm">
          <TextField
            type="text"
            placeholder="HH:MM"
            value={time}
            onChange={handleTimeChange}
            className="w-24 rounded-r-none"
            pattern="\d{2}:\d{2}"
            inputMode="numeric"
            maxLength={5}
            style={
              {
                '--input-padding': '8px',
                '--input-height': '36px',
              } as React.CSSProperties
            }
          />

          <Button
            variant="ghost"
            size="md"
            className="!min-w-fit rounded-l-none rounded-r-md"
            onClick={() => setIs24hFormat(!is24hFormat)}
          >
            {is24hFormat ? '24h' : '12h'}
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
        open={isOpen}
        onOpenChange={onClose}
        className="w-full shadow-elevation-4"
        contentClassName="w-full h-full !border-none !shadow-elevation-4 !gap-2"
        footerClassName="hidden"
        content={content}
      />
    );
  }

  return <div className="-translate-y-1">{content}</div>;
};
