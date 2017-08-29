# Keeping up-to-date with upstream master / vector\_tiles branch

When a new version of upstream/master is released:
- merge it in upstream vector\_tiles branch and create a PR upstream;
- when it is merged, merge that branch into c2c\_patches\_vector\_tiles and create a PR here;
- publish the version to the @camptocamp organization


# Releasing the built package to the @camptocamp npm organization

```bash
npm install
npm run release
npm publish --access public
```
