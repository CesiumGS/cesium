define([
	"dojo/_base/declare",
	"dojo/_base/html",
	"dojo/window",
	"dijit/Dialog"
], function(declare, html, win, Dialog){

return declare("dojox.grid.enhanced.plugins.Dialog", Dialog, {
	refNode: null,
	_position: function(){
		if(this.refNode && !this._relativePosition){
			var refPos = html.position(html.byId(this.refNode)),
				thisPos = html.position(this.domNode),
				viewPort = win.getBox();
			if(thisPos.w && thisPos.h){
				if(refPos.x < 0){
					refPos.x = 0;
				}
				if(refPos.x + refPos.w > viewPort.w){
					refPos.w = viewPort.w - refPos.x;
				}
				if(refPos.y < 0){
					refPos.y = 0;
				}
				if(refPos.y + refPos.h > viewPort.h){
					refPos.h = viewPort.h - refPos.y;
				}
				refPos.x = refPos.x + refPos.w / 2 - thisPos.w / 2;
				refPos.y = refPos.y + refPos.h / 2 - thisPos.h / 2;
				if(refPos.x >= 0 && refPos.x + thisPos.w <= viewPort.w &&
					refPos.y >= 0 && refPos.y + thisPos.h <= viewPort.h){
					this._relativePosition = refPos;
				}
			}
		}
		this.inherited(arguments);
	}
});
});
