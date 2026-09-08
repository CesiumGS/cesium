# CesiumJS Sandcastle

This package contains the Sandcastle application: the editor, gallery UI, sharing tools, standalone view, viewer iframe, search, and build/deployment support.

For contributor guidance on how Sandcastle fits into CesiumJS library development, see the [Sandcastle Guide](../../Documentation/Contributors/SandcastleGuide/README.md). For guidance on adding or updating gallery examples, see the [Sandcastle Authoring Guide](../../Documentation/Contributors/SandcastleGuide/AuthoringGuide.md).

## Running/Building

- `npm run dev`: run the development server
- `npm run dev-no-embedding`: run the development server without generating semantic search embeddings
- `npm run build-gallery`: run the gallery build for local development
- `npm run build-gallery-no-embedding`: run the gallery build without generating semantic search embeddings
- `npm run create-demo [demo-slug]`: template out a new demo in the gallery directory. See the [Sandcastle Authoring Guide](../../Documentation/Contributors/SandcastleGuide/AuthoringGuide.md) before opening a pull request for a new example.

Linting and code style is managed under the project root's scripts.

## Building Sandcastle

There are 2 main conceptual ways that Sandcastle gets built, based on how it accesses CesiumJS resources:

1. Sandcastle points to "external" paths for CesiumJS resources
2. Sandcastle is built to 1 static location that is co-located with all CesiumJS files, i.e. they are all copied into the built location

The first method is useful and desired when developing the project locally and you want to refer to the actively built and updated CesiumJS files as you do other work. This is how the Sandcastle development server (`npm run dev`) and the local static version at `/Apps/Sandcastle2` are built.

The second method is used when building Sandcastle to be deployed to the website or other static location. You can think of this as "bundling" all the necessary files needed for Sandcastle into 1 single directory.

Regardless of the method, Sandcastle is always built using the exported `buildStatic`, `createSandcastleConfig`, and `buildGalleryList` functions. Refer to the JSDoc and params for specifics on these functions.

By default the gallery build generates semantic search embeddings by downloading an embedding model at build time. If you run into issues when fetching the open source embedding model, embeddings generation can be skipped in several ways depending on how you are building:

- **`npm run build-sandcastle`** at the project root: pass `--no-embeddings` (e.g. `npm run build-sandcastle -- --no-embeddings`) or set `SANDCASTLE_NO_EMBEDDINGS=1` in your environment.
- **`npm start`** at the project root: pass `--no-embeddings` (e.g. `npm start -- --no-embeddings`) or set `SANDCASTLE_NO_EMBEDDINGS=1` in your environment. This applies both to the initial build when `Apps/Sandcastle2` does not exist and to gallery rebuilds triggered by file changes.
- **`npm run dev`** in this package: use the dedicated `npm run dev-no-embedding` script, or set `SANDCASTLE_NO_EMBEDDINGS=1` in your environment.
- **`npm run build-gallery`** in this package: use the dedicated `npm run build-gallery-no-embedding` script, or set `SANDCASTLE_NO_EMBEDDINGS=1`.
- **`node scripts/buildGallery.js` directly**: pass `--no-embeddings` or set `SANDCASTLE_NO_EMBEDDINGS=1`.

When embeddings are not generated, the semantic search feature will be unavailable at runtime but all other gallery functionality remains unaffected.

### Application/Viewer structure

At a high level, Sandcastle is broken into 2 main parts:

- The **Sandcastle App**, which is the Sandcastle UI including the code editor, gallery, sharing tools, and settings.
  - The **Standalone page** is equivalent to the Sandcastle App but much more simplified.
- The **Viewer**, which is the actual space where a Sandcastle's code runs. This is contained in an `iframe`.

The `iframe` that the Viewer is loaded from is a separate page (loaded by the `Bucket` component), and they communicate using [`postMessage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) calls (see `IframeBridge`). For added security using `postMessage`, it's [good practice](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#security_concerns) to only send messages to a known origin and check the origin of messages you receive. It's also recommended to validate the structure of data you receive, which we do in the `IframeBridge`.

Given this separation, the build process needs to know what **origin** each part is expected to be located at. The `createSandcastleConfig` function takes these in as `outerOrigin` for the App and `innerOrigin` for the Viewer part. These origins can be the same, but it is not recommended because you lose cross-origin security benefits like local storage isolation. It is also possible for Sandcastle code to modify the App page directly if they are on the same origin.

Currently for local development using `npm run dev` these run at the same origin of `localhost:5173` for simplicity with `vite`. When running locally in the CesiumJS repo (`npm run start` at the root) these are split to `localhost:8080` for App and `localhost:8081` for the Viewer. Other deployments are managed by the build functions in CI.

## Gallery structure

The gallery for Sandcastle is located in the `gallery` directory. A "single sandcastle" consists of 4 files, which should be contained in a sub-directory that matches the id of the sandcastle.

```text
gallery
├── 3d-models             <-- "slug" id
│   ├── index.html        <-- Code that goes into the HTML tab
│   ├── main.js           <-- Code that goes into the JS tab (the main code of a Sandcastle)
│   ├── sandcastle.yaml   <-- Metadata file containing title, description, labels, etc.
│   └── thumbnail.jpg     <-- Optional thumbnail file
└── gallery-list.json     <-- "entry point" for a gallery, generated with `scripts/buildGallery.js`
```

Use `npm run create-demo [demo-slug]` to scaffold a new gallery demo. For guidance on when to add a new example, how to prepare data, and what maintainers look for in review, see the [Sandcastle Authoring Guide](../../Documentation/Contributors/SandcastleGuide/AuthoringGuide.md).

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
