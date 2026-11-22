# CesiumJS Sandcastle

This package is the application for Sandcastle.

## Running/Building

- `npm run build`: build the static site into `dist/` against the pinned CesiumJS 1.x (`cesium-1x`, a dev dependency of the repository root). Options: `--out-dir`, `--outer-origin`, `--inner-origin`, `--production` (leave out development gallery entries), `--no-embeddings`
- `npm run dev`: run the development server (run `npm run build` once first: it bundles the pinned release's packages)
- `npm run dev-no-embedding`: run the development server without generating semantic search embeddings
- `npm run build-gallery`: run the gallery build for local development
- `npm run build-gallery-no-embedding`: run the gallery build without generating semantic search embeddings
- `npm run create-demo [demo-slug]`: template out a new demo in the gallery directory

Linting and code style is managed under the project root's scripts.

## Building Sandcastle

There are 2 main conceptual ways that Sandcastle gets built which mostly revolve around how to access CesiumJS resources:

1. Sandcastle points to "external" paths for CesiumJS resources
2. Sandcastle is built to 1 static location that is co-located with all CesiumJS files. ie they're all copied into the built location

The first method is how the Sandcastle development server (`npm run dev`) works: it serves CesiumJS's files from the pinned release in `node_modules`.

The second method is `npm run build` (`scripts/build.js`), for a deployment or any other static location. You can think of this as "bundling" all the necessary files needed for Sandcastle into 1 single directory.

On the Cesium 2.0 branch, CesiumJS 1.x isn't built from source: it comes from the pinned release (`cesium-1x`, an npm alias of `cesium` at an exact version). The published `@cesium/core`, `@cesium/gltf`, `@cesium/engine` and `@cesium/widgets` carry their source modules but no bundle, so `npm run build` bundles each one's `index.js` with Vite, leaving the other `@cesium` packages to the import map.

Regardless the method you want to use Sandcastle is always built using the exported `buildStatic`, `createSandcastleConfig` and `buildGalleryList` functions. Refer to the JSDoc and params for specifics on these functions.

By default the gallery build generates semantic search embeddings by downloading an embedding model at build time. If you run into issues when fetching the open source embedding model, embeddings generation can be skipped in several ways depending on how you are building:

- **`npm run build`** in this package (or `npm run build-sandcastle` at the project root): pass `--no-embeddings` (e.g. `npm run build -- --no-embeddings`) or set `SANDCASTLE_NO_EMBEDDINGS=1` in your environment.
- **`npm run dev`** in this package: use the dedicated `npm run dev-no-embedding` script, or set `SANDCASTLE_NO_EMBEDDINGS=1` in your environment.
- **`npm run build-gallery`** in this package: use the dedicated `npm run build-gallery-no-embedding` script, or set `SANDCASTLE_NO_EMBEDDINGS=1`.
- **`node scripts/buildGallery.js` directly**: pass `--no-embeddings` or set `SANDCASTLE_NO_EMBEDDINGS=1`.

When embeddings are not generated, the semantic search feature will be unavailable at runtime but all other gallery functionality remains unaffected.

### Application/Viewer structure

At a high level Sandcastle is broken into 2 main parts:

- The **Sandcastle App** which is the Sandcastle UI including the code editor and gallery etc.
  - The **Standalone page** is equivalent to the Sandcastle App but much more simplified
- The **Viewer** which is the actual space where a Sandcastle's code actually runs. This is contained in an `iframe`

The `iframe` that the Viewer is loaded from is a separate page (loaded by the `Bucket` component) and they communicate using [`postMessage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) calls (see `IframeBridge`). For added security using `postMessage` it's [good practice](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#security_concerns) to only send messages to a known origin and check the origin of messages you receive. It's also recommended to validate the structure of data you receive which we do in the `IframeBridge`

Given this separation the build process needs to know what **origin** each part is expected to be located at. The `createSandcastleConfig` function will take take these in as `outerOrigin` for the App and `innerOrigin` for the Viewer part. These origins can be the same but it is not recommended as you lose the cross-origin security benefits like local storage isolation. It is also possible for Sandcastle code to modify the App page directly if they are on the same origin.

Currently for local development using `npm run dev` these run at the same origin of `localhost:5173` for simplicity with `vite`. `npm run build` defaults to `localhost:8080` for the App and `localhost:8081` for the Viewer; pass `--outer-origin` and `--inner-origin` for other deployments.

## Gallery structure

The gallery for Sandcastle is located in the `gallery` directory. A "single sandcastle" consists of 4 files which should be contained in a sub-directory that matches the id of the sandcastle.

```text
gallery
├── 3d-models             <-- "slug" id
│   ├── index.html        <-- Code that goes into the HTML tab
│   ├── main.js           <-- Code that goes into the JS tab (the main code of a Sandcastle)
│   ├── sandcastle.yaml   <-- Metadata file containing title, description, labels, etc.
│   └── thumbnail.jpg     <-- Optional thumbnail file
└── gallery-list.json     <-- "entry point" for a gallery, generated with `scripts/buildGallery.js`
```

Use `npm run create-demo [demo-slug]` to help easily scaffold out a new gallery demo.

### `sandcastle.yaml`

Below is a sample metadata yaml file. This data is used in the `scripts/buildGallery.js` file to create the full `gallery-list.json` information. That script also does some validation on these values.

```yaml
# Used to map this sandcastle to a legacy html identifier. New sandcastles should NOT include this
legacyId: 3D Models Coloring.html
# Title for this sandcastle
title: 3D Models Coloring
# Description for this sandcastle
description: Change color of 3D models.
# Labels for this Sandcastle to help with filtering
labels:
  - Showcases
  - Beginner
# Optional thumbnail file. If set the file should be in the same directory
thumbnail: thumbnail.jpg
# Identify this as a development only Sandcastle. Will not be included in production builds if true
development: false
```

### Thumbnails

Thumbnails should be any image that represents what the sandcastle does. Often this will just be the Viewer with or without any Sandcastle interaction buttons.

Thumbnail files should be limited in size to help save on bandwidth. For consistency we have chosen the dimensions `225x150px` for our images.

## Expanding the ESLint configuration

<!-- TODO: this section was auto-generated, should figure out if we want these suggestions then remove this -->

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ["./tsconfig.node.json", "./tsconfig.app.json"],
      tsconfigRootDir: import.meta.dirname,
    },
  },
});
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    "react-x": reactX,
    "react-dom": reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs["recommended-typescript"].rules,
    ...reactDom.configs.recommended.rules,
  },
});
```
