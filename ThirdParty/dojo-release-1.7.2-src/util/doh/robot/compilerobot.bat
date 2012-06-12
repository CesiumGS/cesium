setlocal
set JDK14_HOME=C:\Program Files\IBM\Java60
del DOHRobot*.class
"%JDK14_HOME%\bin\javac" -source 1.4 -target 1.4 -classpath "%JDK14_HOME%\jre\lib\plugin.jar" DOHRobot.java
del DOHRobot.jar
"%JDK14_HOME%\bin\jar" cvf DOHRobot.jar DOHRobot*.class META-INF
"%JDK14_HOME%\bin\jarsigner" -keystore ./dohrobot DOHRobot.jar dojo <key
del DOHRobot*.class
endlocal
