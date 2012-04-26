
JETTY
=====

The Jetty project is a 100% Java HTTP Server, HTTP Client
and Servlet Container.


The Jetty @ eclipse project is based on the Jetty project at codehaus

  http://jetty.codehaus.org

Ongoing development is now at the eclipse foundation

  http://www.eclipse.org/jetty/


Jetty @ eclipse is open source and is dual licensed using the apache 2.0 and
eclipse public license 1.0.   You may choose either license when distributing
jetty.



BUILDING JETTY
==============

Jetty uses maven 2 as its build system.  Maven will fetch
the dependancies, build the server and assemble a runnable
version:

  mvn install



RUNNING JETTY
=============

The run directory is either the top-level of a binary release
or jetty-distribution/target/assembly-prep directory when built from
source.

To run with the default options:

  java -jar start.jar

To see the available options and the default arguments
provided by the start.ini file:

  java -jar start.jar --help

To run with extra configuration file(s) appended, eg SSL

  java -jar start.jar etc/jetty-ssl.xml

To run with properties 

  java -jar start.jar jetty.port=8081

To run with extra configuration file(s) prepended, eg logging & jmx

  java -jar start.jar --pre=etc/jetty-logging.xml --pre=etc/jetty-jmx.xml 

To run without the args from start.ini 

  java -jar start.jar --ini OPTIONS=Server,websocket etc/jetty.xml etc/jetty-deploy.xml etc/jetty-ssl.xml

to list the know OPTIONS:

  java -jar start.jar --list-options

