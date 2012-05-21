define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/sniff",
	"dojo/_base/window",
	"dojo/dom-class",
	"dojo/dom-geometry",
	"dojo/dom-style",
	"dojo/window",
	"dijit/_WidgetBase",
	"dojo/_base/array",
	"dijit/registry"
], function(declare, lang, has, win, domClass, domGeometry, domStyle, windowUtils, WidgetBase, array, registry){

	/*=====
		WidgetBase = dijit._WidgetBase;
	=====*/
	return declare("dojox.mobile.Overlay", WidgetBase, {
		// summary:
		//		A non-templated widget that animates up from the bottom, overlaying the current content
		//

		baseClass: "mblOverlay mblOverlayHidden",

		show: function(/*DomNode?*/aroundNode){
			// summary:
			//		Scroll the overlay up into view
			array.forEach(registry.findWidgets(this.domNode), function(w){
				if(w && w.height == "auto" && typeof w.resize == "function"){
					w.resize();
				}
			});
			var vp, popupPos;
			var reposition = lang.hitch(this, function(){
				domStyle.set(this.domNode, { position: "", top: "auto", bottom: "0px" });
				popupPos = domGeometry.position(this.domNode);
				vp = windowUtils.getBox();
				if((popupPos.y+popupPos.h) != vp.h // TODO: should be a has() test for position:fixed not scrolling
					|| has('android') < 3){ // android 2.x supports position:fixed but child transforms don't persist
					popupPos.y = vp.t + vp.h - popupPos.h;
					domStyle.set(this.domNode, { position: "absolute", top: popupPos.y + "px", bottom: "auto" });
				}
			});
			reposition();
			if(aroundNode){
				var aroundPos = domGeometry.position(aroundNode);
				if(popupPos.y < aroundPos.y){ // if the aroundNode is under the popup, try to scroll it up
					win.global.scrollBy(0, aroundPos.y + aroundPos.h - popupPos.y);
					reposition();
				}
			}
			domClass.replace(this.domNode, ["mblCoverv", "mblIn"], ["mblOverlayHidden", "mblRevealv", "mblOut", "mblReverse"]);
			var _domNode = this.domNode;
			setTimeout(function(){
				domClass.add(_domNode, "mblTransition");
			}, 100);
			var timeoutHandler = null;
			this._moveHandle = this.connect(win.doc.documentElement, "ontouchmove", function(){
				if(timeoutHandler){
					clearTimeout(timeoutHandler);
				}
				timeoutHandler = setTimeout(function(){
					reposition();
					timeoutHandler = null;
				}, 0);
			});
		},

		hide: function(){
			// summary:
			//		Scroll the overlay down and then make it invisible
			if(this._moveHandle){
				this.disconnect(this._moveHandle);
				this._moveHandle = null;
			}
			if(has("webkit")){
				var handler = this.connect(this.domNode, "webkitTransitionEnd", function(){
					this.disconnect(handler);
					domClass.replace(this.domNode, ["mblOverlayHidden"], ["mblRevealv", "mblOut", "mblReverse", "mblTransition"]);
				});
				domClass.replace(this.domNode, ["mblRevealv", "mblOut", "mblReverse"], ["mblCoverv", "mblIn", "mblTransition"]);
				var _domNode = this.domNode;
				setTimeout(function(){
					domClass.add(_domNode, "mblTransition");
				}, 100);
			}else{
				domClass.replace(this.domNode, ["mblOverlayHidden"], ["mblCoverv", "mblIn", "mblRevealv", "mblOut", "mblReverse"]);
			}
		},

		onBlur: function(/*Event*/e){
			return false; // touching outside the overlay area does not call hide()
		}
	});
});
