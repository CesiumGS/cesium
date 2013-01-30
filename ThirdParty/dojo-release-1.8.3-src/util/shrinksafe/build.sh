#!/bin/sh
RHINO=../js.jar
TEST=$1

# create shrinksafe.jar from src/
rm -rf bin
mkdir bin
cd src
javac -classpath $RHINO:. -d ../bin org/dojotoolkit/shrinksafe/Main.java
mkdir ../bin/org/dojotoolkit/shrinksafe/resources
cp org/dojotoolkit/shrinksafe/resources/Messages.properties ../bin/org/dojotoolkit/shrinksafe/resources/Messages.properties
cd ../bin
jar cfm ../shrinksafe.jar ../src/manifest *
cd ..
rm -rf bin

# call build.sh test to run the unit tests immediately
if [ "$TEST" == "test" ]; then
	echo "Running tests."
	cd tests
	./runner.sh  #| grep errors -1
fi

