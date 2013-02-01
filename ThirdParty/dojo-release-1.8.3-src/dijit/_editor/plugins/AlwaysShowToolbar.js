define([
	"dojo/_base/declare", // declare
	"dojo/dom-class", // domClass.add domClass.remove
	"dojo/dom-construct", // domConstruct.place
	"dojo/dom-geometry",
	"dojo/_base/lang", // lang.hitch
	"dojo/sniff", // has("ie") has("opera")
	"dojo/_base/window", // win.body
	"../_Plugin"
], function(declare, domClass, domConstruct, domGeometry, lang, has, win, _Plugin){

// module:
//		dijit/_editor/plugins/AlwaysShowToolbar

return declare("dijit._editor.plugins.AlwaysShowToolbar", _Plugin, {
	// summary:
	//		This plugin is required for Editors in auto-expand mode.
	//		It handles the auto-expansion as the user adds/deletes text,
	//		and keeps the editor's toolbar visible even when the top of the editor
	//		has scrolled off the top of the viewport (usually when editing a long
	//		document).
	// description:
	//		Specify this in extraPlugins (or plugins) parameter and also set
	//		height to "".
	// example:
	//	|	<script type="dojo/require">
	//	|		AlwaysShowToolbar: "dijit/_editor/plugins/AlwaysShowToolbar"
	//	|	</script>
	//	|	<div data-dojo-type="dijit/Editor" height=""
	//	|			data-dojo-props="extraPlugins: [AlwaysShowToolbar]">

	// _handleScroll: Boolean
	//		Enables/disables the handler for scroll events
	_handleScroll: true,

	setEditor: function(e){
		// Overrides _Plugin.setEditor().
		if(!e.iframe){
			console.log('Port AlwaysShowToolbar plugin to work with Editor without iframe');
			return;
		}

		this.editor = e;

		e.onLoadDeferred.then(lang.hitch(this, this.enable));
	},

	enable: function(d){
		// summary:
		//		Enable plugin.  Called when Editor has finished initializing.
		// tags:
		//		private

		this._updateHeight();
		this.connect(window, 'onscroll', "globalOnScrollHandler");
		this.connect(this.editor, 'onNormalizedDisplayChanged', "_updateHeight");
		return d;
	},

	_updateHeight: function(){
		// summary:
		//		Updates the height of the editor area to fit the contents.
		var e = this.editor;
		if(!e.isLoaded){ return; }
		if(e.height){ return; }

		var height = domGeometry.getMarginSize(e.editNode).h;
		if(has("opera")){
			height = e.editNode.scrollHeight;
		}
		// console.debug('height',height);
		// alert(this.editNode);

		//height maybe zero in some cases even though the content is not empty,
		//we try the height of body instead
		if(!height){
			height = domGeometry.getMarginSize(e.document.body).h;
		}

		if(height == 0){
			console.debug("Can not figure out the height of the editing area!");
			return; //prevent setting height to 0
		}
		if(has("ie") <= 7 && this.editor.minHeight){
			var min = parseInt(this.editor.minHeight);
			if(height < min){ height = min; }
		}
		if(height != this._lastHeight){
			this._lastHeight = height;
			// this.editorObject.style.height = this._lastHeight + "px";
			domGeometry.setMarginBox(e.iframe, { h: this._lastHeight });
		}
	},

	// _lastHeight: Integer
	//		Height in px of the editor at the last time we did sizing
	_lastHeight: 0,

	globalOnScrollHandler: function(){
		// summary:
		//		Handler for scroll events that bubbled up to `<html>`
		// tags:
		//		private

		var isIE6 = has("ie") < 7;
		if(!this._handleScroll){ return; }
		var tdn = this.editor.header;
		if(!this._scrollSetUp){
			this._scrollSetUp = true;
			this._scrollThreshold = domGeometry.position(tdn, true).y;
//			var db = win.body;
//			console.log("threshold:", this._scrollThreshold);
			//what's this for?? comment out for now
//			if((isIE6)&&(db)&&(domStyle.set or get TODO(db, "backgroundIimage")=="none")){
//				db.style.backgroundImage = "url(" + dojo.uri.moduleUri("dijit", "templates/blank.gif") + ")";
//				db.style.backgroundAttachment = "fixed";
//			}
		}

		var scrollPos = domGeometry.docScroll(this.editor.ownerDocument).y;
		var s = tdn.style;

		if(scrollPos > this._scrollThreshold && scrollPos < this._scrollThreshold+this._lastHeight){
			// dojo.debug(scrollPos);
			if(!this._fixEnabled){
				var tdnbox = domGeometry.getMarginSize(tdn);
				this.editor.iframe.style.marginTop = tdnbox.h+"px";

				if(isIE6){
					s.left = domGeometry.position(tdn).x;
					if(tdn.previousSibling){
						this._IEOriginalPos = ['after',tdn.previousSibling];
					}else if(tdn.nextSibling){
						this._IEOriginalPos = ['before',tdn.nextSibling];
					}else{
						this._IEOriginalPos = ['last',tdn.parentNode];
					}
					this.editor.ownerDocumentBody.appendChild(tdn);
					domClass.add(tdn,'dijitIEFixedToolbar');
				}else{
					s.position = "fixed";
					s.top = "0px";
				}

				domGeometry.setMarginBox(tdn, { w: tdnbox.w });
				s.zIndex = 2000;
				this._fixEnabled = true;
			}
			// if we're showing the floating toolbar, make sure that if
			// we've scrolled past the bottom of the editor that we hide
			// the toolbar for this instance of the editor.

			// TODO: when we get multiple editor toolbar support working
			// correctly, ensure that we check this against the scroll
			// position of the bottom-most editor instance.
			var eHeight = (this.height) ? parseInt(this.editor.height) : this.editor._lastHeight;
			s.display = (scrollPos > this._scrollThreshold+eHeight) ? "none" : "";
		}else if(this._fixEnabled){
			this.editor.iframe.style.marginTop = '';
			s.position = "";
			s.top = "";
			s.zIndex = "";
			s.display = "";
			if(isIE6){
				s.left = "";
				domClass.remove(tdn,'dijitIEFixedToolbar');
				if(this._IEOriginalPos){
					domConstruct.place(tdn, this._IEOriginalPos[1], this._IEOriginalPos[0]);
					this._IEOriginalPos = null;
				}else{
					domConstruct.place(tdn, this.editor.iframe, 'before');
				}
			}
			s.width = "";
			this._fixEnabled = false;
		}
	},

	destroy: function(){
		// Overrides _Plugin.destroy().   TODO: call this.inherited() rather than repeating code.
		this._IEOriginalPos = null;
		this._handleScroll = false;
		this.inherited(arguments);

		if(has("ie") < 7){
			domClass.remove(this.editor.header, 'dijitIEFixedToolbar');
		}
	}
});

});
