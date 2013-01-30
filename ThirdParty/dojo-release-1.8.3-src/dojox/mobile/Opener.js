define([
	"dojo/_base/declare",
	"dojo/_base/Deferred",
	"dojo/_base/lang",
	"dojo/_base/window",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dojo/dom-style",
	"dojo/dom-geometry",
	"./Tooltip",
	"./Overlay",
	"./lazyLoadUtils"
], function(declare, Deferred, lang, win, domClass, domConstruct, domStyle, domGeometry, Tooltip, Overlay, lazyLoadUtils){

	var isOverlay = domClass.contains(win.doc.documentElement, "dj_phone");
	
	var cls = declare("dojox.mobile.Opener", isOverlay ? Overlay : Tooltip, {
		// summary:
		//		A non-templated popup widget that will use either Tooltip or 
		//		Overlay depending on screen size.

		// lazy: String
		//		If true, the content of the widget, which includes dojo markup,
		//		is instantiated lazily. That is, only when the widget is opened
		//		by the user, the required modules are loaded and the content
		//		widgets are instantiated.
		lazy: false,

		// requires: String
		//		Comma-separated required module names to be lazily loaded. This
		//		is effective only when lazy=true. All the modules specified with
		//		dojoType and their depending modules are automatically loaded
		//		when the widget is opened. However, if you need other extra
		//		modules to be loaded, use this parameter.
		requires: "",

		buildRendering: function(){
			this.inherited(arguments);
			this.cover = domConstruct.create('div', {
				onclick: lang.hitch(this, '_onBlur'), 'class': 'mblOpenerUnderlay',
				style: { position: isOverlay ? 'absolute' : 'fixed', backgroundColor:'transparent', overflow:'hidden', zIndex:'-1' }
			}, this.domNode, 'first');
		},

		onShow: function(/*DomNode*/node){},
		onHide: function(/*DomNode*/node, /*Anything*/v){},

		show: function(node, positions){
			if(this.lazy){
				this.lazy = false;
				var _this = this;
				return Deferred.when(lazyLoadUtils.instantiateLazyWidgets(this.domNode, this.requires), function(){
					return _this.show(node, positions);
				});
			}
			this.node = node;
			this.onShow(node);
			domStyle.set(this.cover, { top:'0px', left:'0px', width:'0px', height:'0px' }); // move cover temporarily to calculate domNode vertical position correctly
			this._resizeCover(domGeometry.position(this.domNode, false)); // must be before this.inherited(arguments) for Tooltip sizing
			return this.inherited(arguments);
		},

		hide: function(/*Anything*/ val){
			this.inherited(arguments);
			this.onHide(this.node, val);
		},
		
		_reposition: function(){
			// tags:
			//		private
			var popupPos = this.inherited(arguments);
			this._resizeCover(popupPos);
			return popupPos;
		},

		_resizeCover: function(popupPos){
			// tags:
			//		private
			if(isOverlay){
				if(parseInt(domStyle.get(this.cover, 'top')) != -popupPos.y || parseInt(domStyle.get(this.cover, 'height')) != popupPos.y){
					var x = Math.max(popupPos.x, 0); // correct onorientationchange values
					domStyle.set(this.cover, { top:-popupPos.y+'px', left:-x+'px', width:popupPos.w+x+'px', height:popupPos.y+'px' });
				}
			}else{
				domStyle.set(this.cover, { 
					width:Math.max(win.doc.documentElement.scrollWidth || win.body().scrollWidth || win.doc.documentElement.clientWidth)+'px', 
					height:Math.max(win.doc.documentElement.scrollHeight || win.body().scrollHeight || win.doc.documentElement.clientHeight)+'px' 
				});
			}			
		},

		_onBlur: function(e){
			// tags:
			//		private
			var ret = this.onBlur(e);
			if(ret !== false){ // only exactly false prevents hide()
				this.hide(e);
			}
			return ret;
		}
	});
	cls.prototype.baseClass += " mblOpener"; // add to either mblOverlay or mblTooltip
	return cls;
});
