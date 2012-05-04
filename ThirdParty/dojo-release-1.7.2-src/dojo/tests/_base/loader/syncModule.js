if (typeof dojoCdnTestLog=="undefined"){
	dojoCdnTestLog= [];
}
dojoCdnTestLog.push("in-dojo.tests._base.loader.syncModule");
dojo.provide("dojo.tests._base.loader.syncModule");
dojo.declare("dojo.tests._base.loader.syncModule", null, {});
dojo.tests._base.loader.syncModule.status= "OK";
dojo.require("dojo.tests._base.loader.syncModuleDep");
dojoCdnTestLog.push("out-dojo.tests._base.loader.syncModule");
