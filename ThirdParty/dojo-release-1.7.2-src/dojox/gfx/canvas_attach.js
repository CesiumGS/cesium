define(["dojo/_base/lang", "dojo/_base/kernel","dojox/gfx/canvas"], function(lang,kernel,canvas){
	lang.getObject("dojox.gfx.canvas_attach", true);
	kernel.experimental("dojox.gfx.canvas_attach");

	// not implemented
	canvas.attachSurface = canvas.attachNode = function(){
		return null;	// for now
	};

	return canvas;
});
