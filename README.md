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

| Property           | Type                      | Description                                                |
|--------------------|---------------------------|------------------------------------------------------------|
| `isPreviewMode`    | `boolean`                 | Indicates whether the page is in preview mode or not.      |
| `togglePreviewMode`| `(flag: boolean) => void` | Function to toggle preview mode with a boolean flag.       |
| `onPublish`        | `(data: Data) => void`    | Function to handle publishing of the page.                 |
| `data` (optional)  | `Data`                    | Optional property holding data related to the page.        |

## Data Interface

The `Data` interface defines the structure of the data object that can be passed to the `onPublish` function and optionally included in the `data` property of `DdocProps`.

### Properties

| Property          | Type             | Description                                    |
|-------------------|------------------|------------------------------------------------|
| `metaData`        | `PluginMetaData` | Contains metadata related to the plugin.       |
| `editorJSONData`  | `JSONContent`    | Contains JSON data for the editor content.     |

## PluginMetaData Interface

The `PluginMetaData` interface defines the structure of the metadata related to the plugin.

### Properties

| Property          | Type        | Description                                    |
|-------------------|-------------|------------------------------------------------|
| `cover`           | `Cover`     | Contains information about the cover.          |
| `plugin`          | `Plugin`    | Contains information about the plugin title.   |

## Cover Interface

The `Cover` interface defines the structure of the cover information.

### Properties

| Property   | Type             | Description                                           |
|------------|------------------|-------------------------------------------------------|
| `image`    | `string \| null` | URL of the cover image (can be `null`).               |
| `emoji`    | `string \| null` | Emoji associated with the cover (can be `null`).      |
| `name`     | `string \| null` | Name of the cover (can be `null`).                    |

## Plugin Interface

The `Plugin` interface defines the structure of the plugin information.

### Properties

| Property   | Type             | Description                                           |
|------------|------------------|-------------------------------------------------------|
| `title`    | `string \| null` | Title of the plugin (can be `null`).                  |


### Steps to run this example locally

- `npm i`
- `npm run dev`

It will open up a vite server, that will have the Ddoc Editor