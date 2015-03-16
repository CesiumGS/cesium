## How to contribute to Underscore-contrib

* Before you open a ticket or send a pull request, [search](https://github.com/documentcloud/underscore-contrib/issues) for previous discussions about the same feature or issue. Add to the earlier ticket if you find one.

* Before sending a pull request for a feature, be sure to have [tests like found in Underscore](http://underscorejs.org/test/). Tests may be run in a browser by opening `test/index.html`. Tests and linting can be run in the terminal by using the `grunt test` command, or `grunt watch:test` to automatically rerun after file save.

* Use the same coding  [style as Underscore](https://github.com/documentcloud/underscore/blob/master/underscore.js).

* In your pull request, do not add documentation, edit the files in `dist/` or use grunt to re-build the files in `dist/`. We'll do those things before cutting a new release.
