dojo.provide("dojox.date.tests.module");

try{
	dojo.require("dojox.date.tests.timezone");
	dojo.require("dojox.date.tests.timezoneFormatting");
	dojo.require("dojox.date.tests.relative");
	dojo.require("dojox.date.tests.hebrew.Date");
	dojo.require("dojox.date.tests.islamic.Date");
	dojo.require("dojox.date.tests.buddhist.Date");
	dojo.require("dojox.date.tests.posix");
}catch(e){
	doh.debug(e);
}

