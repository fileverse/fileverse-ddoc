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

| Property                                       | Type                              | Description                                                                                           |
| ---------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `isPreviewMode`                                | `boolean`                         | Indicates whether the page is in preview mode or not.                                                 |
| `handleImageUploadToIpfs`                            | `(file: File) => Promise<string>` | Required function to upload ddoc editor's image on IPFS                                               |
| `data` (optional)                              | `Data`                            | Optional property holding data related to the page.                                                   |
| `enableCollaboration` (optional)               | `boolean`                         | Optional property to enable collaboration                                                             |
| `collaborationId` (optional)                   | `string`                          | When using enableCollaboration, you need to provide collaborationId, it can be uuid of doc            |
| `onAutoSave` (optional)                        | `(flag:boolean) => void`          | Function which expose the current editor state every 10 seconds                                       |
| `renderToolRightSection` (optional)            | `({editor}) => JSX.Element`       | Function that render the right section of the toolbar. it calls the function with the editor instance |
| `renderToolLeftSection` (optional)             | `({editor}) => JSX.Element`       | Accept a react component                                                                              |
| `username` (required when using collaboration) | `boolean`                         | Takes a username which can be used by collaboration cursor    
| `walletAddress` (optional) | `string ` | Takes a wallet address                                        |
| `ref` (optional)                               | `any`                             | Gets editor instance                                                                                  |

## Data Interface

The `Data` interface defines the structure of the data object that can be passed to the `onAutoSave` function and optionally included in the `data` property of `DdocProps`.

### Properties

| Property         | Type          | Description                                |
| ---------------- | ------------- | ------------------------------------------ |
| `editorJSONData` | `JSONContent` | Contains JSON data for the editor content. |

### Steps to run this example locally

- `npm i`
- `npm run dev`

It will open up a vite server, that will have the Ddoc Editor
