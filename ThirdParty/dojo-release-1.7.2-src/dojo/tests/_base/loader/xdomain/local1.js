xdomainExecSequence.push("local1-1");

// multiple dojo.provides should define multiple modules
var x1= dojo.provide("dojo.tests._base.loader.xdomain.local1");
var x2= dojo.provide("dojo.tests._base.loader.xdomain.local1SteppedOn");
var x3= dojo.provide("dojo.tests._base.loader.xdomain.local1NotSteppedOn");
xdomainExecSequence.push("local1-2");

// this puts the loader in xd loading mode
dojo.require("dojo.cookie");
xdomainExecSequence.push("local1-3");

// load a not xd module while in xd loading mode
dojo.require("dojo.tests._base.loader.xdomain.local1-dep");
xdomainExecSequence.push("local1-4");

// a loadInit that makes a calculation a later requireIf depends upon
dojo.loadInit(function(){
	xdomainExecSequence.push("local1-5");
	var dependentModule= dojo.getObject("dojo.tests._base.loader.xdomain.local1-runtimeDependent", true);
	dependentModule.choice = 1;
});
xdomainExecSequence.push("local1-6");

// a couple of requireIf's, only one of which should result in a module being loaded
dojo.requireIf(dojo.getObject("dojo.tests._base.loader.xdomain.local1-runtimeDependent").choice==1, "dojo.tests._base.loader.xdomain.local1-runtimeDependent1");
xdomainExecSequence.push("local1-7");
dojo.requireIf(dojo.getObject("dojo.tests._base.loader.xdomain.local1-runtimeDependent").choice==2, "dojo.tests._base.loader.xdomain.local1-runtimeDependent2");
xdomainExecSequence.push("local1-8");

// platformRequire test
dojo.platformRequire({
	browser:[
		"dojo.tests._base.loader.xdomain.local1-browser",
		["dojo.tests._base.loader.xdomain.local1-browser-skip", true]
	]
});

// these are xd bundles which should be loaded async
xdomainExecSequence.push("local1-9");
dojo.requireLocalization("dojo", "colors");
xdomainExecSequence.push("local1-10");
dojo.requireLocalization("dojo", "colors", "fr");
xdomainExecSequence.push("local1-11");
dojo.requireLocalization("dojo", "colors");
xdomainExecSequence.push("local1-12");

// these are not xd bundles which should be loaded sync
dojo.requireLocalization("dojo.tests._base.loader", "amdBundle");
xdomainExecSequence.push("local1-13");
dojo.requireLocalization("dojo.tests._base.loader", "amdBundle", "ab");
xdomainExecSequence.push("local1-14");
dojo.requireLocalization("dojo.tests._base.loader", "syncBundle");
xdomainExecSequence.push("local1-15");
dojo.requireLocalization("dojo.tests._base.loader", "syncBundle", "ab");
xdomainExecSequence.push("local1-16");

// another loadInit; it should be executed immediately after the first load init
dojo.loadInit(function(){
	xdomainExecSequence.push("local1-17");
	var dependentModule= dojo.getObject("dojo.tests._base.loader.xdomain.local1-runtimeDependent");
	dependentModule.status = "ok";
});
xdomainExecSequence.push("local1-18");

xdomainLog.push(
1, (x1===dojo.tests._base.loader.xdomain.local1),
2, (x1===dojo.getObject("dojo.tests._base.loader.xdomain.local1")),
3, (x2===dojo.tests._base.loader.xdomain.local1SteppedOn),
4, (x2===dojo.getObject("dojo.tests._base.loader.xdomain.local1SteppedOn")),
5, (x3===dojo.tests._base.loader.xdomain.local1NotSteppedOn),
6, (x3===dojo.getObject("dojo.tests._base.loader.xdomain.local1NotSteppedOn")));

x3.status = "local1NotSteppedOn";
dojo.tests._base.loader.xdomain.local1= "stepOnLocal1";
dojo.tests._base.loader.xdomain.local1SteppedOn= "stepOn1SteppedOn";

xdomainLog.push(
7, ("stepOnLocal1"===dojo.tests._base.loader.xdomain.local1),
8, ("stepOnLocal1"===dojo.getObject("dojo.tests._base.loader.xdomain.local1")),
9, ("stepOn1SteppedOn"===dojo.tests._base.loader.xdomain.local1SteppedOn),
10, ("stepOn1SteppedOn"===dojo.getObject("dojo.tests._base.loader.xdomain.local1SteppedOn")));
