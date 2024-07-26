# Ddoc Editor

This repo contains example source code and package code

`/src/packages/ddoc/` contains the package code

## Usage

### Prequisites

- You should be using tailwindcss and it must have tailwind configuration

`import { DdocEditor } from '@fileverse-dev/ddoc'`

`import '@fileverse-dev/ddoc/dist/style.css'` in App.jsx/App.tsx

In your tailwind config, add this line to content array

`@fileverse-dev/ddoc/dist/index.es.js`

That's it, you should be able to use DdocEditor now

### Props

# DdocProps Interface

The `DdocProps` interface is a TypeScript interface that defines the properties for a component related to a page. This interface includes properties for handling preview mode, publishing data, and optional data related to the page's metadata and content.

## Properties

| Property                                       | Type                                           | Description                                                                                               |
| ---------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `isPreviewMode`                                | `boolean`                                      | Indicates whether the page is in preview mode or not.                                                     |
| `data` (optional)                              | `Data`                                         | Optional property holding data related to the page.                                                       |
| `enableCollaboration` (optional)               | `boolean`                                      | Optional property to enable collaboration                                                                 |
| `onCommentInteraction` (optional)              | `(commentInfo: IEditSelectionData) => void`    | Optional function that get's called whenever there is a mouse-over and click interaction on a comment     |
| `collaborationId` (optional)                   | `string`                                       | When using enableCollaboration, you need to provide collaborationId, it can be uuid of doc                |
| `onTextSelection` (optional)                   | `(data: IEditorSelectionData) => void`         | Function called when a text is selected on the editor                                                     |
| `renderToolRightSection` (optional)            | `({editor}) => JSX.Element`                    | Function that render the right section of the toolbar. it calls the function with the editor instance     |
| `renderToolLeftSection` (optional)             | `({editor}) => JSX.Element`                    | Accept a react component                                                                                  |
| `username` (required when using collaboration) | `boolean`                                      | Takes a username which can be used by collaboration cursor                                                |
| `walletAddress` (optional)                     | `string `                                      | Takes a wallet address                                                                                    |
| `ref` (optional)                               | `any`                                          | Gets editor instance                                                                                      |
| `ensResolutionUrl` (optional)                  | `string`                                       | Api Url for resolving ens names                                                                           |
| `initialContent` (optional)                    | `JSONContent`                                  | Initial content of the editor                                                                             |
| `onChange` (optional)                          | `(changes: JSONContent) => void`               | Optional function that gets triggered with the latest content of the editor on every change in the editor |
| `onCollaboratorChange` (optional)              | `(collaborators?: IDocCollabUsers[] ) => void` | Optional function that gets triggered when a user join or leave the doc during collaboration              |
| `onError` (optional)                           | `(errorString: string) => void`                | Function to call on error                                                                                 |
| `setCharacterCount` (optional)                 | ` React.Dispatch<SetStateAction<number>>`      | Optional. React Set State function to update Character Count                                              |
| `setWordCount` (optional)                      | ` React.Dispatch<SetStateAction<number>>`      | Optional. React Set State function to update Word Count                                                   |

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
