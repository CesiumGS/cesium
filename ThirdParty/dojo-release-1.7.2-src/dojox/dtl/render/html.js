define([
	"dojo/_base/lang",
	"../render/dom",
	"../_base"
], function(lang,ddrd,dd){
	/*=====
		dd = dojox.dtl;
	=====*/ 
	lang.getObject("dojox.dtl.render.html", true);

	dd.render.html.Render = ddrd.Render;
	return dojox.dtl.render.html;
});
