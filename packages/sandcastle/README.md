# CesiumJS Sandcastle

This package is the application for Sandcastle.

## Running/Building

- `npm run dev`: run the development server
- `npm run build`: alias for `npm run build-app`
- `npm run build-app`: build to static files in `/Apps/Sandcastle2` for hosting/access from the root cesium dev server
- `npm run build-ci`: build to static files in `/Apps/Sandcastle2` and configure paths as needed for CI deployment

Linting and style is managed under the project root's scripts.

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
