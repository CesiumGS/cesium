define([
	"dojo/_base/kernel",
	"dojo/_base/lang",
	"dojo/_base/window",
	"dojox/mobile/sniff"
], function(dojo, lang, win, has){
	win.doc.documentElement.className += lang.trim([
		has('bb') ? "dj_bb" : "",
		has('android') ? "dj_android" : "",
		has('iphone') ? "dj_iphone" : "",
		has('ipod') ? "dj_ipod" : "",
		has('ipad') ? "dj_ipad" : ""
	].join(" ").replace(/ +/g," "));
	return dojo;
});
