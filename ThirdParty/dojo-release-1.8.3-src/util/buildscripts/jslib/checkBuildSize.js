//assumes cwd of util/buildscripts

//TODO: could take profile and compression option as args

load("jslib/logger.js");
load("jslib/fileUtil.js");
load("jslib/buildUtil.js");

var result = buildUtil.makeDojoJs(buildUtil.loadDependencyList(buildUtil.evalProfile("profiles/base.profile.js")), "0.0.0");

var layer0 = buildUtil.optimizeJs(null, result[0].contents, null, "shrinksafe");
print(layer0.length);

