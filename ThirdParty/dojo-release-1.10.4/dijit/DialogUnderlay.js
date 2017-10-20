define([
	"dojo/_base/declare", // declare
	"dojo/_base/lang", // lang.hitch
	"dojo/aspect", // aspect.after
	"dojo/dom-attr", // domAttr.set
	"dojo/dom-style", // domStyle.getComputedStyle
	"dojo/on",
	"dojo/window", // winUtils.getBox, winUtils.get
	"./_Widget",
	"./_TemplatedMixin",
	"./BackgroundIframe",
	"./Viewport",
	"./main" // for back-compat, exporting dijit._underlay (remove in 2.0)
], function(declare, lang, aspect, domAttr, domStyle, on,
			winUtils, _Widget, _TemplatedMixin, BackgroundIframe, Viewport, dijit){

	// module:
	//		dijit/DialogUnderlay

	var DialogUnderlay = declare("dijit.DialogUnderlay", [_Widget, _TemplatedMixin], {
		// summary:
		//		A component used to block input behind a `dijit/Dialog`.
		//
		//		Normally this class should not be instantiated directly, but rather shown and hidden via
		//		DialogUnderlay.show() and DialogUnderlay.hide().  And usually the module is not accessed directly
		//		at all, since the underlay is shown and hidden by Dialog.DialogLevelManager.
		//
		//		The underlay itself can be styled based on and id:
		//	|	#myDialog_underlay { background-color:red; }
		//
		//		In the case of `dijit.Dialog`, this id is based on the id of the Dialog,
		//		suffixed with _underlay.

		// Template has two divs; outer div is used for fade-in/fade-out, and also to hold background iframe.
		// Inner div has opacity specified in CSS file.
		templateString: "<div class='dijitDialogUnderlayWrapper'><div class='dijitDialogUnderlay' tabIndex='-1' data-dojo-attach-point='node'></div></div>",

		// Parameters on creation or updatable later

		// dialogId: String
		//		Id of the dialog.... DialogUnderlay's id is based on this id
		dialogId: "",

		// class: String
		//		This class name is used on the DialogUnderlay node, in addition to dijitDialogUnderlay
		"class": "",

		// This will get overwritten as soon as show() is call, but leave an empty array in case hide() or destroy()
		// is called first.   The array is shared between instances but that's OK because we never write into it.
		_modalConnects: [],

		_setDialogIdAttr: function(id){
			domAttr.set(this.node, "id", id + "_underlay");
			this._set("dialogId", id);
		},

		_setClassAttr: function(clazz){
			this.node.className = "dijitDialogUnderlay " + clazz;
			this._set("class", clazz);
		},

		postCreate: function(){
			// Append the underlay to the body
			this.ownerDocumentBody.appendChild(this.domNode);

			this.own(on(this.domNode, "keydown", lang.hitch(this, "_onKeyDown")));

			this.inherited(arguments);
		},

		layout: function(){
			// summary:
			//		Sets the background to the size of the viewport
			//
			// description:
			//		Sets the background to the size of the viewport (rather than the size
			//		of the document) since we need to cover the whole browser window, even
			//		if the document is only a few lines long.
			// tags:
			//		private

			var is = this.node.style,
				os = this.domNode.style;

			// hide the background temporarily, so that the background itself isn't
			// causing scrollbars to appear (might happen when user shrinks browser
			// window and then we are called to resize)
			os.display = "none";

			// then resize and show
			var viewport = winUtils.getBox(this.ownerDocument);
			os.top = viewport.t + "px";
			os.left = viewport.l + "px";
			is.width = viewport.w + "px";
			is.height = viewport.h + "px";
			os.display = "block";
		},

		show: function(){
			// summary:
			//		Show the dialog underlay
			this.domNode.style.display = "block";
			this.open = true;
			this.layout();
			this.bgIframe = new BackgroundIframe(this.domNode);

			var win = winUtils.get(this.ownerDocument);
			this._modalConnects = [
				Viewport.on("resize", lang.hitch(this, "layout")),
				on(win, "scroll", lang.hitch(this, "layout"))
			];

		},

		hide: function(){
			// summary:
			//		Hides the dialog underlay

			this.bgIframe.destroy();
			delete this.bgIframe;
			this.domNode.style.display = "none";
			while(this._modalConnects.length){ (this._modalConnects.pop()).remove(); }
			this.open = false;
		},

		destroy: function(){
			while(this._modalConnects.length){ (this._modalConnects.pop()).remove(); }
			this.inherited(arguments);
		},

		_onKeyDown: function(){
			// summary:
			//		Extension point so Dialog can monitor keyboard events on the underlay.
		}
	});

	DialogUnderlay.show = function(/*Object*/ attrs, /*Number*/ zIndex){
		// summary:
		//		Display the underlay with the given attributes set.  If the underlay is already displayed,
		//		then adjust it's attributes as specified.
		// attrs:
		//		The parameters to create DialogUnderlay with.
		// zIndex:
		//		zIndex of the underlay

		var underlay = DialogUnderlay._singleton;
		if(!underlay || underlay._destroyed){
			underlay = dijit._underlay = DialogUnderlay._singleton = new DialogUnderlay(attrs);
		}else{
			if(attrs){ underlay.set(attrs); }
		}
		domStyle.set(underlay.domNode, 'zIndex', zIndex);
		if(!underlay.open){
			underlay.show();
		}
	};

	DialogUnderlay.hide = function(){
		// summary:
		//		Hide the underlay.

		// Guard code in case the underlay widget has already been destroyed
		// because we are being called during page unload (when all widgets are destroyed)
		var underlay = DialogUnderlay._singleton;
		if(underlay && !underlay._destroyed){
			underlay.hide();
		}
	};

	return DialogUnderlay;
});
