# CesiumJS Sandcastle

This package is the application for Sandcastle.

## Running/Building

- `npm run dev`: run the development server
- `npm run build-gallery`: build the gallery into this package's public directory
- This package does not handle building itself. Instead it exposes build functions meant to be called from the project root or other locations. See the _Building Sandcastle_ section below

Linting and style is managed under the repo's root scripts.

## Deploying Sandcastle

When working on any Sandcastle features it's important to remember everywhere that we can use Sandcastle and make sure features will work everywhere. This is especially important with urls/paths and online/offline interactions.

- `localhost:5173` - Locally developing Sandcastle itself, use `npm run dev` here
- `localhost:8080/Apps/Sandcastle2` - Locally at the repository root, use `npm start` at the project root
  - This only works after building to `Apps/Sandcastle2`. The local server should do this for you the first time or run `npm run build-sandcastle`
  - This is also the method that anyone running Sandcastle from the [zip file download](https://cesium.com/downloads#cesiumjs) of CesiumJS would use
- CI: `https://ci-builds.cesium.com/cesium/main/Apps/Sandcastle2/index.html` - Built and deployed in the CI workflows
- CDN: `https://cesium.com/downloads/cesiumjs/releases/1.136/Apps/Sandcastle2/index.html` - a static hosted version of CesiumJS alongside every release
- `dev-sandcastle.cesium.com` - "preview" version of Sandcastle up to date with `main`. Built and deployed through CI
- `sandcastle.cesium.com` - The main sandcastle page. Deployed from the `cesium.com` branch through CI as part of our release process

Historically Sandcastle has been completely serverless meaning it's trivial to deploy the static files to all of these locations. Going forward this is expected to remain the "baseline". Even as features get added that may require a user account or potentially even a server the core of Sandcastle should continue to operate without those features.

## Building Sandcastle

There are 2 main conceptual ways that Sandcastle gets built which mostly revolve around how to access CesiumJS resources:

1. Sandcastle points to "external" paths for CesiumJS resources
2. Sandcastle is built to 1 static location that is co-located with all CesiumJS files. ie they're all copied into the built location

The first method is useful and desired when developing the project locally and you want to refer to the actively built and updated CesiumJS files as you do other work. This is how the Sandcastle development server (`npm run dev`) and the local static version at `/Apps/Sandcastle2` are built.

The second method is used when building Sandcastle to be deployed to the website or other static location. You can think of this as "bundling" all the necessary files needed for Sandcastle into 1 single directory.

Regardless the method you want to use Sandcastle is always built using the exported `buildStatic`, `createSandcastleConfig` and `buildGalleryList` functions.

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

### `sandcastle.yaml`

Below is a sample metadata yaml file. This data is used in the `scripts/buildGallery.js` file to create the full `gallery-list.json` information. That script also does some validation on these values.

```yaml
# The id of this sandcastle. Should match the sub-directory name and not contain spaces
id: 3d-models-coloring
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

Thumbnails should be any image that represents what the sandcastle does. Often this will just be the Viewer with or without any Sandcastle interaction buttons. Thumbnail files should be limited in size to help save on bandwidth. Currently most are around 225px in width.
