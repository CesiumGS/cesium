Bean Scripting Framework (BSF) is a set of Java classes which provides an
easy to use scripting language support within Java applications.  It also
provides access to Java objects and methods from supported scripting
languages.  BSF allows one to write JSPs in languages other than Java
while providing access to the Java class library.  In addition, BSF
permits any Java application to be implemented in part (or dynamically
extended) by a language that is embedded within it.  This is achieved by
providing an API that permits calling scripting language engines from
within Java, as well as an object registry that exposes Java objects to
these scripting language engines.

BSF supports several scripting languages currently.  Here is the list of the
scripting languages that are knwon to BSF to be available
('org/apache/bsf/Languages.properties'):

    * beanbasic = org.apache.bsf.engines.beanbasic.BeanBasicEngine, bb
    * beanshell = bsh.util.BeanShellBSFEngine, bsh
    * bml = org.apache.bml.ext.BMLEngine, bml
    * groovy = org.codehaus.groovy.bsf.GroovyEngine, groovy|gy
    * jacl = org.apache.bsf.engines.jacl.JaclEngine, jacl
    * java = org.apache.bsf.engines.java.JavaEngine, java
    * javaclass = org.apache.bsf.engines.javaclass.JavaClassEngine, class
    * javascript = org.apache.bsf.engines.javascript.JavaScriptEngine, js
    * jpython = org.apache.bsf.engines.jpython.JPythonEngine, py
    * judoscript = com.judoscript.BSFJudoEngine, judo|jud
    * jython = org.apache.bsf.engines.jython.JythonEngine, py
    * lotusscript = org.apache.bsf.engines.lotusscript.LsEngine, lss
    * netrexx = org.apache.bsf.engines.netrexx.NetRexxEngine, nrx
    * objectscript = oscript.bsf.ObjectScriptEngine, os
    * perl = org.apache.bsf.engines.perl.PerlEngine, pl
    * pnuts = pnuts.ext.PnutsBSFEngine, pnut
    * prolog = ubc.cs.JLog.Extras.BSF.JLogBSFEngine, plog|prolog
    * rexx = org.rexxla.bsf.engines.rexx.RexxEngine, rex | rexx | cls | rxj | rxs
    * ruby = org.jruby.javasupport.bsf.JRubyEngine, rb
    * xslt = org.apache.bsf.engines.xslt.XSLTEngine, xslt

In addition, there may be additional scripting languages made available for
being used in the BSF framework that are not listed here.

Information on where to obtain some of these scripting languages for use with BSF
is available on the Related Projects page at the BSF web site

http://jakarta.apache.org/bsf/index.html


