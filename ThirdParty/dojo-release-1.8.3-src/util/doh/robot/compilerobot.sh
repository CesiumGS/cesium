rm DOHRobot*.class
javac -classpath /System/Library/Frameworks/JavaVM.framework/Versions/1.5.0/Home/lib/plugin.jar DOHRobot.java

rm DOHRobot.jar
jar cvf DOHRobot.jar DOHRobot*.class
rm DOHRobot*.class

jarsigner DOHRobot.jar dojo
