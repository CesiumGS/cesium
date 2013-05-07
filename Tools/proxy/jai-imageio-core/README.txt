jai-imageio-core-standalone 
===========================

The source code for the jai-imageio-core project is copyrighted code that
is licensed to individuals or companies who download or otherwise
access the code.

The copyright notice for this project is in COPYRIGHT.txt

The source code license for this project is in LICENSE.txt

To build this project, use Apache Maven 2.0.9 or newer and run:
    mvn clean install


Standalone modifications
------------------------

NOTE:

This is a 'standalone' version of jai-imageio-core where dependencies
to jai-core (javax.media.jai) has been removed. This version also 
does not include any of the C implementations from libJIIO, meaning
that this version is fully redistributable under the modified
BSD license in LICENSE.txt.

Modifications (c) Stian Soiland-Reyes <stian@soiland-reyes.com> 2010-04-30


Maven repository
----------------

To use jai-imageio-core-standalone from a Maven project, add:

<dependency>
    <groupId>net.java.dev.jai-imageio</groupId> 
    <artifactId>jai-imageio-core-standalone</artifactId> 
    <version>1.2-pre-dr-b04-2010-04-30</version> 
</dependency>

and:

    <repositories>
        <repository>
            <releases />
            <snapshots>
                <enabled>false</enabled>
            </snapshots>
            <id>mygrid-repository</id>
            <name>myGrid Repository</name>
            <url>http://www.mygrid.org.uk/maven/repository</url>
        </repository>
    </repositories>


More info
---------
http://github.com/stain/jai-imageio-core
https://jai-imageio-core.dev.java.net/
