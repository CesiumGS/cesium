export default {
  "*.{js,cjs,mjs,ts,tsx,css,html}": [
    "eslint --cache --quiet",
    "prettier --write",
  ],
  "*.md": ["markdownlint", "prettier --write"],
};
