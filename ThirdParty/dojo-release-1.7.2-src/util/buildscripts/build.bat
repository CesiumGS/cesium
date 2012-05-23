@rem set NODE_HOME=C:\Users\IBM_ADMIN\Downloads\node
@rem set PATH=%NODE_HOME%;%PATH%
@rem Something like this will be required for cygwin... node is not 100% confirmed working at this point
@rem node ../../dojo/dojo.js load=build %*


java -Xms256m -Xmx256m  -cp ../shrinksafe/js.jar;../closureCompiler/compiler.jar;../shrinksafe/shrinksafe.jar org.mozilla.javascript.tools.shell.Main  ../../dojo/dojo.js baseUrl=../../dojo load=build %*


@rem java -classpath ../shrinksafe/js.jar;../shrinksafe/shrinksafe.jar org.mozilla.javascript.tools.shell.Main build.js %*

@rem java -Xms256m -Xmx256m -classpath ../shrinksafe/js.jar;../shrinksafe/shrinksafe.jar org.mozilla.javascript.tools.shell.Main  build.js %*
