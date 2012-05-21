#!/bin/sh

cd ../../doh
java -classpath ../shrinksafe/js.jar:../shrinksafe/shrinksafe.jar org.mozilla.javascript.tools.shell.Main runner.js testModule=shrinksafe.tests.module testUrl=../shrinksafe/tests/module.js
