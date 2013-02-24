#!/bin/sh

cd ../../doh
java -classpath ../shrinksafe/js.jar:../shrinksafe/shrinksafe.jar org.mozilla.javascript.tools.shell.Main ../../dojo/dojo.js baseUrl=../../dojo load=doh test=util/shrinksafe/tests/module testUrl=../shrinksafe/tests/module.js
