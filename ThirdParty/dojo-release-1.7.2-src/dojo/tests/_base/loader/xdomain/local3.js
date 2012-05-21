xdomainExecSequence.push("local3-1");
dojo.provide("dojo.tests._base.loader.xdomain.local3");
xdomainExecSequence.push("local3-2");

// load a local module that will have to be transformed
//debugger;
dojo.require("dojo.tests._base.loader.xdomain.local1");
xdomainExecSequence.push("local3-3");

dojo.tests._base.loader.xdomain.local3.status = "local3-loaded";
