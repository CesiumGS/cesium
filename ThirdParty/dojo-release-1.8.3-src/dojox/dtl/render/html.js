define([
	"dojo/_base/lang",
	"../render/dom",
	"../_base"
], function(lang,ddrd,dd){

	lang.getObject("dojox.dtl.render.html", true);

	dd.render.html.Render = ddrd.Render;
	return dojox.dtl.render.html;
});
