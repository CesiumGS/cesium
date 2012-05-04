dojo.loadInit(function(){
	// this function is evaluated first and only once
	dojoCdnTestLog.push("loadInit in cdnTest");
	// define a global variable
	dojoCdnTest= 1;
});

dojoCdnTestLog.push("in-dojo.tests._base.loader.cdnTest");
dojo.provide("dojo.tests._base.loader.cdnTest");
dojo.provide("dojo.tests._base.loader.cdnTest2");
dojo.tests._base.loader.cdnTest.status= "OK";
dojo.tests._base.loader.cdnTest2.status= "OK";
dojo.require("dojo.tests._base.loader.syncModule");
dojo.require("dojo.tests._base.loader.amdModule");
dojo.requireLocalization("dojo.tests._base.loader", "syncBundle", "ab-cd-ef");
dojo.requireLocalization("dojo.tests._base.loader", "amdBundle", "ab-cd-ef");

(function(){
var t1= dojo.i18n.getLocalization("dojo.tests._base.loader", "syncBundle");
var t2= dojo.i18n.getLocalization("dojo.tests._base.loader", "syncBundle", "ab-cd-ef");
var t3= dojo.i18n.getLocalization("dojo.tests._base.loader", "amdBundle");
var t4= dojo.i18n.getLocalization("dojo.tests._base.loader", "amdBundle", "ab-cd-ef");

require(["doh"], function(doh){
	doh.register("test-i18n-inline", function(t){
		t.is(t1.syncBundle, "syncBundle");
		t.is(t2.syncBundle, "syncBundle-ab-cd-ef");
		t.is(t3.amdBundle, "amdBundle");
		t.is(t4.amdBundle, "amdBundle-ab-cd-ef");
	});
});
})();


dojo.requireIf(dojoCdnTest==1, "dojo.tests._base.loader.syncModule1");
dojo.requireAfterIf(dojoCdnTest==1, "dojo.tests._base.loader.amdModule1");
dojo.requireIf(dojoCdnTest==2, "dojo.tests._base.loader.syncModule2");
dojo.requireAfterIf(dojoCdnTest==2, "dojo.tests._base.loader.amdModule2");
dojoCdnTestLog.push("out-dojo.tests._base.loader.cdnTest");
