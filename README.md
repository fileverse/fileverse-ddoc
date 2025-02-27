# Ddoc Editor

[ddocs.new](http://ddocs.new/) is your onchain, privacy-first alternative to G**gle D*cs: peer-to-peer, end-to-end encrypted, and decentralized. It enables secure, real-time, and async collaboration without compromising user privacy.

<img width="4410" alt="github_banner_final@3x" src="https://github.com/user-attachments/assets/c6ee706d-979d-41b6-9f73-d29fbabb5152" />


This repository contains:
`/package` – The core package code. 
Example & demo source code to showcase dDocs functionalities.

## Usage

### Prequisites

To use dDocs, ensure your project is set up with Tailwind CSS and have a Tailwind configuration file

### Install & import
Add the following imports
```javascript
import { DdocEditor } from '@fileverse-dev/ddoc'
import '@fileverse-dev/ddoc/styles' // in App.jsx/App.tsx
```


### Update Tailwind Config
In your tailwind config, add this line to content array
`@fileverse-dev/ddoc/dist/index.es.js`

You should now be set to use dDocs!


# dDocProps Interface

The `DdocProps` interface is a TypeScript interface that defines the properties for a page-related component. It includes properties for handling preview mode, managing publishing data, and optionally storing metadata and content associated with the page.

## Properties

| Property                                       | Type                                           | Description                                                                                                                                                                                                   |
| ---------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `isPreviewMode`                                | `boolean`                                      | Indicates whether the page is in preview mode or not.                                                                                                                                                         |
| `data` (optional)                              | `Data`                                         | Optional property holding data related to the page.                                                                                                                                                           |
| `enableCollaboration` (optional)               | `boolean`                                      | Optional property to enable collaboration                                                                                                                                                                     |
| `onCommentInteraction` (optional)              | `(commentInfo: IEditSelectionData) => void`    | Optional function that get's called whenever there is a mouse-over and click interaction on a comment                                                                                                         |
| `collaborationId` (optional)                   | `string`                                       | When using enableCollaboration, you need to provide collaborationId, it can be uuid of doc                                                                                                                    |
| `onTextSelection` (optional)                   | `(data: IEditorSelectionData) => void`         | Function called when a text is selected on the editor                                                                                                                                                         |
| `renderToolRightSection` (optional)            | `({editor}) => JSX.Element`                    | Function that render the right section of the toolbar. it calls the function with the editor instance                                                                                                         |
| `renderToolLeftSection` (optional)             | `({editor}) => JSX.Element`                    | Accept a react component                                                                                                                                                                                      |
| `username` (required when using collaboration) | `boolean`                                      | Takes a username which can be used by collaboration cursor                                                                                                                                                    |
| `walletAddress` (optional)                     | `string `                                      | Takes a wallet address                                                                                                                                                                                        |
| `ref` (optional)                               | `any`                                          | Gets editor instance                                                                                                                                                                                          |
| `ensResolutionUrl` (optional)                  | `string`                                       | Api Url for resolving ens names                                                                                                                                                                               |
| `secureImageUploadUrl` (optional)              | `string`                                       | Api Url for secure image upload                                                                                                                                                                               |
| `initialContent` (optional)                    | `JSONContent`                                  | Initial content of the editor                                                                                                                                                                                 |
| `onChange` (optional)                          | `(changes: JSONContent) => void`               | Optional function that gets triggered with the latest content of the editor on every change in the editor                                                                                                     |
| `onCollaboratorChange` (optional)              | `(collaborators?: IDocCollabUsers[] ) => void` | Optional function that gets triggered when a user join or leave the doc during collaboration                                                                                                                  |
| `onError` (optional)                           | `(errorString: string) => void`                | Function to call on error                                                                                                                                                                                     |
| `setCharacterCount` (optional)                 | `React.Dispatch<SetStateAction<number>>`       | Optional. React Set State function to update Character Count                                                                                                                                                  |
| `setWordCount` (optional)                      | `React.Dispatch<SetStateAction<number>>`       | Optional. React Set State function to update Word Count                                                                                                                                                       |
| `scrollPosition`(optional)                     | `number`                                       | User cursor position to scroll to on intitalising the content of the editor                                                                                                                                   |
| `enableIndexeddbSync` (optional)               | `boolean`                                      | Indicates when to use yjs-indexeddb provider                                                                                                                                                                  |
| `ddocId` (optional)                            | `string`                                       | custom ID for the document (this has to be provided to enable yjs-indexeddb provider)                                                                                                                         |
| `editorCanvasClassNames`(optional)             | `string`                                       | Optional. Extra className for editor-canvas                                                                                                                                                                   |
| `selectedTags` (optional)                      | `TagType[]`                                    | Array of currently selected tags                                                                                                                                                                              |
| `setSelectedTags` (optional)                   | `React.Dispatch<SetStateAction<TagType[]>>`    | Function to update selected tags                                                                                                                                                                              |
| `zoomLevel` (required)                         | `string`                                       | Current zoom level of the editor                                                                                                                                                                              |
| `setZoomLevel` (required)                      | `React.Dispatch<SetStateAction<string>>`       | Function to update zoom level                                                                                                                                                                                 |
| `isNavbarVisible` (required)                   | `boolean`                                      | Controls visibility of the navbar                                                                                                                                                                             |
| `setIsNavbarVisible` (required)                | `React.Dispatch<SetStateAction<boolean>>`      | Function to toggle navbar visibility                                                                                                                                                                          |
| `renderNavbar` (optional)                      | `({ editor: JSONContent }) => JSX.Element`     | Function to render custom navbar content                                                                                                                                                                      |
| `disableBottomToolbar` (optional)              | `boolean`                                      | When true, disables the bottom toolbar                                                                                                                                                                        |
| `isPresentationMode` (optional)                | `boolean`                                      | Controls if editor is in presentation mode                                                                                                                                                                    |
| `setIsPresentationMode` (optional)             | `React.Dispatch<SetStateAction<boolean>>`      | Function to toggle presentation mode                                                                                                                                                                          |
| `onInlineComment` (optional)                   | `() => void`                                   | Callback function when inline comment is added                                                                                                                                                                |
| `onMarkdownExport` (optional)                  | `() => void`                                   | Callback function for markdown export                                                                                                                                                                         |
| `onMarkdownImport` (optional)                  | `() => void`                                   | Callback function for markdown import                                                                                                                                                                         |
| `sharedSlidesLink` (optional)                  | `string`                                       | Link for shared slides in presentation mode                                                                                                                                                                   |
| `documentName` (optional)                      | `string`                                       | Name of the document                                                                                                                                                                                          |
| `onSlidesShare` (optional)                     | `() => void`                                   | Callback                                                                                                                                                                                                      |

## Data Interface

The `Data` interface defines the structure of the data object

### Properties

| Property         | Type          | Description                                |
| ---------------- | ------------- | ------------------------------------------ |
| `editorJSONData` | `JSONContent` | Contains JSON data for the editor content. |

### Steps to run this example locally

- `npm i`
- `npm run dev`

It will open up a vite server, that will have the Ddoc Editor

⚠️ This repository is currently undergoing rapid development, with frequent updates and changes. We recommend not to use in production yet

## Pro Extensions Setup

1. Configure your `.npmrc` with the appropriate registry and authentication token:

2. Install the corresponding extension packages:

3. Use the extension in your DdocEditor component:

```tsx
proExtensions={{
  TableOfContents
}}
```

### Comment-related Props

| Prop                   | Type                                    | Description                                              |
| ---------------------- | --------------------------------------- | -------------------------------------------------------- |
| `initialComments`      | `IComment[]`                            | Array of initial comments to populate the editor         |
| `onCommentReply`       | `(id: string, reply: IComment) => void` | Callback function when a reply is added to a comment     |
| `onNewComment`         | `(comment: IComment) => void`           | Callback function when a new comment is created          |
| `setInitialComments`   | `(comments: IComment[]) => void`        | Function to update the initial comments array            |
| `onResolveComment`     | `(commentId: string) => void`           | Callback function when a comment is marked as resolved   |
| `onUnresolveComment`   | `(commentId: string) => void`           | Callback function when a comment is marked as unresolved |
| `onDeleteComment`      | `(commentId: string) => void`           | Callback function when a comment is deleted              |
| `commentDrawerOpen`    | `boolean`                               | Controls the visibility of the comment drawer            |
| `setCommentDrawerOpen` | `(isOpen: boolean) => void`             | Function to toggle the comment drawer                    |

### Table of Contents Props

| Prop            | Type                                                    | Description                                         |
| --------------- | ------------------------------------------------------- | --------------------------------------------------- |
| `showTOC`       | `boolean`                                               | Controls the visibility of the table of contents    |
| `setShowTOC`    | `(show: boolean) => void`                               | Function to toggle the table of contents visibility |
| `proExtensions` | `{ TableOfContents: any, getHierarchicalIndexes: any }` | Extensions for table of contents functionality      |

### Authentication Props

| Prop                 | Type                                  | Description                                         |
| -------------------- | ------------------------------------- | --------------------------------------------------- |
| `isConnected`        | `boolean`                             | Indicates if the user is connected                  |
| `connectViaWallet`   | `() => Promise<void>`                 | Function to handle wallet-based authentication      |
| `isLoading`          | `boolean`                             | Indicates if authentication is in progress          |
| `connectViaUsername` | `(username: string) => Promise<void>` | Function to handle username-based authentication    |
| `isDDocOwner`        | `boolean`                             | Indicates if the current user is the document owner |
