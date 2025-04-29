# ReminderBlock Extension

The ReminderBlock extension is a powerful feature that allows users to create and manage reminders directly within the document editor. It provides a seamless way to set reminders with customizable titles and timestamps.

## Features

- Create reminders with custom titles and timestamps
- Quick options for common reminder intervals (20 minutes, 1 hour, 3 hours, tomorrow 9 AM, next week 9 AM)
- Custom date and time selection
- Visual indicators for overdue reminders
- Navigation between reminders
- Mobile-responsive design
- Authentication-based visibility control

## Installation

The ReminderBlock extension is included in the DdocEditor package. To use it, you need to configure it when initializing the editor:

```typescript
import { DdocEditor } from '@fileverse/ddoc-editor';
import { ReminderBlock } from '@fileverse/ddoc-editor/extensions/reminder-block';

<DdocEditor
  extensions={[
    ReminderBlock.configure({
      onReminderCreate: handleReminderCreate,
      onReminderDelete: handleReminderDelete,
      onReminderUpdate: handleReminderUpdate,
      reminders: reminders,
    })
  ]
/>;
```

## Configuration Options

The ReminderBlock extension accepts the following configuration options:

### `onReminderCreate`
- Type: `(reminder: Reminder) => Promise<void>`
- Description: Callback function called when a new reminder is created

### `onReminderDelete`
- Type: `(reminderId: string) => Promise<void>`
- Description: Callback function called when a reminder is deleted

### `onReminderUpdate`
- Type: `(reminder: Reminder) => Promise<void>`
- Description: Callback function called when a reminder is updated

### `reminders`
- Type: `Reminder[]`
- Description: Initial list of reminders to be displayed

## Authentication Control

The Reminder option is only visible in both SlashMenu and BubbleMenu when the user is authenticated. This is controlled by the `isConnected` prop passed to the DdocEditor:

```typescript
<DdocEditor
  // ... other props
  isConnected={true} // Set to true when user is authenticated
/>
```

When `isConnected` is:
- `true`: The Reminder option will be visible in both SlashMenu and BubbleMenu
- `false`: The Reminder option will be hidden from both menus

## Reminder Interface

```typescript
interface Reminder {
  id: string;
  title: string;
  timestamp: string;
  createdAt: string;
  status: 'pending' | 'completed' | 'cancelled';
  walletAddress?: string;
}
```

## Usage

### Creating a Reminder

1. Type `/reminder` in the editor to trigger the reminder menu (only visible when authenticated)
2. Enter a title for your reminder
3. Choose from quick options or set a custom date and time
4. Click "Create" to add the reminder

### Managing Reminders

- Click on a reminder to view its details
- Use the navigation arrows to move between reminders
- Click the trash icon to delete a reminder
- Overdue reminders are visually distinguished and can be easily removed

## Styling

The ReminderBlock extension uses the following CSS classes for styling:

- `reminder-wrapper`: Base styling for reminder blocks
- `reminder-wrapper-overdue`: Styling for overdue reminders
- `reminder-wrapper-text`: Text styling for normal reminders
- `reminder-wrapper-text-overdue`: Text styling for overdue reminders

## Browser Support

The extension requires browser support for:
- Push notifications (for reminder notifications)
- Service Worker (for background processing of reminders) controlled by the consumer app

## Notes

- Reminders are stored inline within the document
- The extension automatically handles timezone conversions
- Push notifications must be enabled in the browser to receive reminder notifications
- The Reminder feature is only available to authenticated users
