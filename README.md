# Ddoc Editor

[ddocs.new](http://ddocs.new/) is your onchain, privacy-first alternative to Google Docs. A self-sovereign note-taking and collaboration app that is peer-to-peer, end-to-end encrypted, and decentralized :yellow_heart:

dDocs enables secure, real-time and asynchronous collaboration without compromising user privacy. It also comes with powerful features like Markdown and LaTeX support, dark mode, offline editing, and mobile browser optimization.

<img width="2308" height="1458" alt="image" src="https://github.com/user-attachments/assets/32875e2e-b30b-431b-bbb6-74ce96f21141" />


This repository contains:

- `/package` – The core package code.
- Example & demo source code to showcase dDocs functionalities.

## Usage

### Prequisites

To use dDocs, ensure your project is set up with Tailwind CSS and have a Tailwind configuration file.

### Install & import

Add the following imports :

```javascript
import { DdocEditor } from '@fileverse-dev/ddoc';
import '@fileverse-dev/ddoc/styles'; // in App.jsx/App.tsx
```

### Update Tailwind Config

In your tailwind config, add this line to content array :

`@fileverse-dev/ddoc/dist/index.es.js`

You should now be set to use dDocs!

# dDocProps Interface

The `DdocProps` interface is a TypeScript interface that defines the properties for a page-related component. It includes properties for handling preview mode, managing publishing data, and optionally storing metadata and content associated with the page.

## Core Props

| Property                 | Type                                          | Description                                     |
| ------------------------ | --------------------------------------------- | ----------------------------------------------- |
| `initialContent`         | `JSONContent`                                 | Initial content of the editor                   |
| `onChange`               | `(changes: JSONContent, chunk?: any) => void` | Callback triggered on editor content changes    |
| `ref`                    | `React.RefObject`                             | Reference to access editor instance             |
| `isPreviewMode`          | `boolean`                                     | Controls if editor is in preview/read-only mode |
| `editorCanvasClassNames` | `string`                                      | Additional CSS classes for editor canvas        |
| `ignoreCorruptedData`    | `boolean`                                     | Whether to ignore corrupted data during loading |
| `onInvalidContentError`  | `(error: any) => void`                        | Callback for handling invalid content errors    |

## Collaboration Props

| Property               | Type                                          | Description                                                               |
| ---------------------- | --------------------------------------------- | ------------------------------------------------------------------------- |
| `enableCollaboration`  | `boolean`                                     | Enables real-time collaboration features                                  |
| `collaborationId`      | `string`                                      | Unique ID for collaboration session (required when collaboration enabled) |
| `username`             | `string`                                      | User's display name for collaboration                                     |
| `setUsername`          | `(username: string) => void`                  | Function to update username                                               |
| `walletAddress`        | `string`                                      | User's wallet address                                                     |
| `onCollaboratorChange` | `(collaborators?: IDocCollabUsers[]) => void` | Callback when collaborators change                                        |
| `enableIndexeddbSync`  | `boolean`                                     | Enables IndexedDB sync for offline support                                |
| `ddocId`               | `string`                                      | Unique document ID (required for IndexedDB sync)                          |

## UI/UX Props

| Property                | Type                                      | Description                          |
| ----------------------- | ----------------------------------------- | ------------------------------------ |
| `zoomLevel`             | `string`                                  | Current zoom level of the editor     |
| `setZoomLevel`          | `React.Dispatch<SetStateAction<string>>`  | Function to update zoom level        |
| `isNavbarVisible`       | `boolean`                                 | Controls navbar visibility           |
| `setIsNavbarVisible`    | `React.Dispatch<SetStateAction<boolean>>` | Function to toggle navbar visibility |
| `renderNavbar`          | `() => JSX.Element`                       | Custom navbar renderer               |
| `renderThemeToggle`     | `() => JSX.Element`                       | Custom theme toggle renderer         |
| `isPresentationMode`    | `boolean`                                 | Controls presentation mode           |
| `setIsPresentationMode` | `React.Dispatch<SetStateAction<boolean>>` | Function to toggle presentation mode |
| `sharedSlidesLink`      | `string`                                  | Link for shared presentation slides  |
| `documentStyling`       | `DocumentStyling`                         | Custom styling for document appearance |

## Document Styling

The `documentStyling` prop allows you to customize the visual appearance of your document with three distinct styling areas:

```typescript
interface DocumentStyling {
  /** 
   * Background styling for the outer document area.
   * Supports CSS background values including gradients.
   * Example: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
   */
  background?: string;
  
  /** 
   * Background color for the editor canvas/content area.
   * Should be a solid color value.
   * Example: "#ffffff" or "rgb(255, 255, 255)"
   */
  canvasBackground?: string;
  
  /** 
   * Text color for the editor content.
   * Example: "#333333" or "rgb(51, 51, 51)"
   */
  textColor?: string;
  
  /** 
   * Font family for the editor content.
   * Example: "Inter, sans-serif" or "'Times New Roman', serif"
   */
  fontFamily?: string;
}
```

### Usage Example

```tsx
<DdocEditor
  documentStyling={{
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    canvasBackground: "#ffffff",
    textColor: "#333333",
    fontFamily: "Inter, sans-serif"
  }}
  // ... other props
/>
```

**Note:** Document styling works in both regular editor mode and presentation mode. In presentation mode, only `canvasBackground`, `textColor`, and `fontFamily` are applied to maintain clean slide appearance.

## Comments & Collaboration Props

| Property               | Type                                    | Description                        |
| ---------------------- | --------------------------------------- | ---------------------------------- |
| `initialComments`      | `IComment[]`                            | Initial comments to display        |
| `setInitialComments`   | `(comments: IComment[]) => void`        | Function to update comments        |
| `onCommentReply`       | `(id: string, reply: IComment) => void` | Callback for comment replies       |
| `onNewComment`         | `(comment: IComment) => void`           | Callback for new comments          |
| `commentDrawerOpen`    | `boolean`                               | Controls comment drawer visibility |
| `setCommentDrawerOpen` | `(isOpen: boolean) => void`             | Function to toggle comment drawer  |
| `onResolveComment`     | `(commentId: string) => void`           | Callback when resolving comments   |
| `onUnresolveComment`   | `(commentId: string) => void`           | Callback when unresolving comments |
| `onDeleteComment`      | `(commentId: string) => void`           | Callback when deleting comments    |
| `disableInlineComment` | `boolean`                               | Disables inline commenting feature |

## Authentication Props

| Property             | Type                                  | Description                         |
| -------------------- | ------------------------------------- | ----------------------------------- |
| `isConnected`        | `boolean`                             | User connection status              |
| `isLoading`          | `boolean`                             | Authentication loading state        |
| `connectViaUsername` | `(username: string) => Promise<void>` | Username-based authentication       |
| `connectViaWallet`   | `() => Promise<void>`                 | Wallet-based authentication         |
| `isDDocOwner`        | `boolean`                             | Indicates if user owns the document |

## Utility Props

| Property               | Type                                     | Description                  |
| ---------------------- | ---------------------------------------- | ---------------------------- |
| `setCharacterCount`    | `React.Dispatch<SetStateAction<number>>` | Updates character count      |
| `setWordCount`         | `React.Dispatch<SetStateAction<number>>` | Updates word count           |
| `ensResolutionUrl`     | `string`                                 | URL for ENS name resolution  |
| `ipfsImageUploadFn` | ` (file: File) => Promise<IpfsImageUploadResponse>`                                 | function for secure image uploads |
| `ipfsImageFetchFn` | ` (_data: IpfsImageFetchPayload) => Promise<{ url: string;file: File;}>`                                 | function for fetch secure image from IPFS |
| `onError`              | `(error: string) => void`                | General error handler        |
| `onInlineComment`      | `() => void`                             | Callback for inline comments |
| `onMarkdownExport`     | `() => void`                             | Callback for markdown export |
| `onMarkdownImport`     | `() => void`                             | Callback for markdown import |
| `onPdfExport`          | `() => void`                             | Callback for pdf export      |
| `onSlidesShare`        | `() => void`                             | Callback for slides sharing  |
| `onComment`            | `() => void`                             | General comment callback     |


## AI Writer Props

| Property           | Type      | Description                                    |
| ------------------ | --------- | ---------------------------------------------- |
| `activeModel`      | `CustomModel` | Currently selected AI model for text generation |
| `maxTokens`        | `number`   | Maximum token limit for AI-generated content    |
| `isAIAgentEnabled` | `boolean`  | Toggle for AI agent functionality               |

### Steps to run this example locally

- `npm i`
- `npm run dev`

It will open up a vite server, that will have the Ddoc Editor.

⚠️ This repository is currently undergoing rapid development, with frequent updates and changes. We recommend not to use in production yet.
