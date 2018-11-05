# Keeping up-to-date with upstream

When a new version of upstream is released:
- merge the tag into the c2c_patches branch and create a PR;
- publish the version to the @camptocamp organization


# Releasing the built package to the @camptocamp npm organization

```bash
npm install
npm run release
npm publish --access public
```
