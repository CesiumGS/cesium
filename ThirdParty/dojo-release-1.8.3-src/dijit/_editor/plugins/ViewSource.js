define([
	"dojo/_base/array", // array.forEach
	"dojo/_base/declare", // declare
	"dojo/dom-attr", // domAttr.set
	"dojo/dom-construct", // domConstruct.create domConstruct.place
	"dojo/dom-geometry", // domGeometry.setMarginBox domGeometry.position
	"dojo/dom-style", // domStyle.set
	"dojo/_base/event", // event.stop
	"dojo/i18n", // i18n.getLocalization
	"dojo/keys",	// keys.F12
	"dojo/_base/lang", // lang.hitch
	"dojo/on", // on()
	"dojo/sniff", // has("ie") has("webkit")
	"dojo/_base/window", // win.body win.global
	"dojo/window", // winUtils.getBox
	"../../focus",	// focus.focus()
	"../_Plugin",
	"../../form/ToggleButton",
	"../..",	// dijit._scopeName
	"../../registry", // registry.getEnclosingWidget()
	"dojo/aspect", // Aspect commands for adice
	"dojo/i18n!../nls/commands"
], function(array, declare, domAttr, domConstruct, domGeometry, domStyle, event, i18n, keys, lang, on, has, win,
	winUtils, focus, _Plugin, ToggleButton, dijit, registry, aspect){

// module:
//		dijit/_editor/plugins/ViewSource


var ViewSource = declare("dijit._editor.plugins.ViewSource",_Plugin, {
	// summary:
	//		This plugin provides a simple view source capability.  When view
	//		source mode is enabled, it disables all other buttons/plugins on the RTE.
	//		It also binds to the hotkey: CTRL-SHIFT-F11 for toggling ViewSource mode.

	// stripScripts: [public] Boolean
	//		Boolean flag used to indicate if script tags should be stripped from the document.
	//		Defaults to true.
	stripScripts: true,

	// stripComments: [public] Boolean
	//		Boolean flag used to indicate if comment tags should be stripped from the document.
	//		Defaults to true.
	stripComments: true,

	// stripComments: [public] Boolean
	//		Boolean flag used to indicate if iframe tags should be stripped from the document.
	//		Defaults to true.
	stripIFrames: true,

	// readOnly: [const] Boolean
	//		Boolean flag used to indicate if the source view should be readonly or not.
	//		Cannot be changed after initialization of the plugin.
	//		Defaults to false.
	readOnly: false,

	// _fsPlugin: [private] Object
	//		Reference to a registered fullscreen plugin so that viewSource knows
	//		how to scale.
	_fsPlugin: null,

	toggle: function(){
		// summary:
		//		Function to allow programmatic toggling of the view.

		// For Webkit, we have to focus a very particular way.
		// when swapping views, otherwise focus doesn't shift right
		// but can't focus this way all the time, only for VS changes.
		// If we did it all the time, buttons like bold, italic, etc
		// break.
		if(has("webkit")){this._vsFocused = true;}
		this.button.set("checked", !this.button.get("checked"));

	},

	_initButton: function(){
		// summary:
		//		Over-ride for creation of the resize button.
		var strings = i18n.getLocalization("dijit._editor", "commands"),
			editor = this.editor;
		this.button = new ToggleButton({
			label: strings["viewSource"],
			ownerDocument: editor.ownerDocument,
			dir: editor.dir,
			lang: editor.lang,
			showLabel: false,
			iconClass: this.iconClassPrefix + " " + this.iconClassPrefix + "ViewSource",
			tabIndex: "-1",
			onChange: lang.hitch(this, "_showSource")
		});

		// IE 7 has a horrible bug with zoom, so we have to create this node
		// to cross-check later.  Sigh.
		if(has("ie") == 7){
			this._ieFixNode = domConstruct.create("div", {
				style: {
					opacity: "0",
					zIndex: "-1000",
					position: "absolute",
					top: "-1000px"
				}
			}, editor.ownerDocumentBody);
		}
		// Make sure readonly mode doesn't make the wrong cursor appear over the button.
		this.button.set("readOnly", false);
	},


	setEditor: function(/*dijit/Editor*/ editor){
		// summary:
		//		Tell the plugin which Editor it is associated with.
		// editor: Object
		//		The editor object to attach the print capability to.
		this.editor = editor;
		this._initButton();

		this.editor.addKeyHandler(keys.F12, true, true, lang.hitch(this, function(e){
			// Move the focus before switching
			// It'll focus back.  Hiding a focused
			// node causes issues.
			this.button.focus();
			this.toggle();
			event.stop(e);

			// Call the focus shift outside of the handler.
			setTimeout(lang.hitch(this, function(){
				// We over-ride focus, so we just need to call.
				this.editor.focus();
			}), 100);
		}));
	},

	_showSource: function(source){
		// summary:
		//		Function to toggle between the source and RTE views.
		// source: boolean
		//		Boolean value indicating if it should be in source mode or not.
		// tags:
		//		private
		var ed = this.editor;
		var edPlugins = ed._plugins;
		var html;
		this._sourceShown = source;
		var self = this;
		try{
			if(!this.sourceArea){
				this._createSourceView();
			}
			if(source){
				// Update the QueryCommandEnabled function to disable everything but
				// the source view mode.  Have to over-ride a function, then kick all
				// plugins to check their state.
				ed._sourceQueryCommandEnabled = ed.queryCommandEnabled;
				ed.queryCommandEnabled = function(cmd){
					return cmd.toLowerCase() === "viewsource";
				};
				this.editor.onDisplayChanged();
				html = ed.get("value");
				html = this._filter(html);
				ed.set("value", html);
				array.forEach(edPlugins, function(p){
					// Turn off any plugins not controlled by queryCommandenabled.
					if(p && !(p instanceof ViewSource) && p.isInstanceOf(_Plugin)){
						p.set("disabled", true)
					}
				});

				// We actually do need to trap this plugin and adjust how we
				// display the textarea.
				if(this._fsPlugin){
					this._fsPlugin._getAltViewNode = function(){
						return self.sourceArea;
					};
				}

				this.sourceArea.value = html;

				// Since neither iframe nor textarea have margin, border, or padding,
				// just set sizes equal
				this.sourceArea.style.height = ed.iframe.style.height;
				this.sourceArea.style.width = ed.iframe.style.width;
				domStyle.set(ed.iframe, "display", "none");
				domStyle.set(this.sourceArea, {
					display: "block"
				});

				var resizer = function(){
					// function to handle resize events.
					// Will check current VP and only resize if
					// different.
					var vp = winUtils.getBox(ed.ownerDocument);

					if("_prevW" in this && "_prevH" in this){
						// No actual size change, ignore.
						if(vp.w === this._prevW && vp.h === this._prevH){
							return;
						}else{
							this._prevW = vp.w;
							this._prevH = vp.h;
						}
					}else{
						this._prevW = vp.w;
						this._prevH = vp.h;
					}
					if(this._resizer){
						clearTimeout(this._resizer);
						delete this._resizer;
					}
					// Timeout it to help avoid spamming resize on IE.
					// Works for all browsers.
					this._resizer = setTimeout(lang.hitch(this, function(){
						delete this._resizer;
						this._resize();
					}), 10);
				};
				this._resizeHandle = on(window, "resize", lang.hitch(this, resizer));

				//Call this on a delay once to deal with IE glitchiness on initial size.
				setTimeout(lang.hitch(this, this._resize), 100);

				//Trigger a check for command enablement/disablement.
				this.editor.onNormalizedDisplayChanged();

				this.editor.__oldGetValue = this.editor.getValue;
				this.editor.getValue = lang.hitch(this, function(){
					var txt = this.sourceArea.value;
					txt = this._filter(txt);
					return txt;
				});
				
				this._setListener = aspect.after(this.editor, "setValue", lang.hitch(this, function(htmlTxt){
					htmlTxt = htmlTxt || "";
					htmlTxt = this._filter(htmlTxt);
					this.sourceArea.value = htmlTxt;
				}), true);
			}else{
				// First check that we were in source view before doing anything.
				// corner case for being called with a value of false and we hadn't
				// actually been in source display mode.
				if(!ed._sourceQueryCommandEnabled){
					return;
				}
				
				// Remove the set listener.
				this._setListener.remove();
				delete this._setListener;
				
				this._resizeHandle.remove();
				delete this._resizeHandle;

				if(this.editor.__oldGetValue){
					this.editor.getValue = this.editor.__oldGetValue;
					delete this.editor.__oldGetValue;
				}

				// Restore all the plugin buttons state.
				ed.queryCommandEnabled = ed._sourceQueryCommandEnabled;
				if(!this._readOnly){
					html = this.sourceArea.value;
					html = this._filter(html);
					ed.beginEditing();
					ed.set("value", html);
					ed.endEditing();
				}

				array.forEach(edPlugins, function(p){
					// Turn back on any plugins we turned off.
					if(p && p.isInstanceOf(_Plugin)){
						p.set("disabled", false);
					}
				});

				domStyle.set(this.sourceArea, "display", "none");
				domStyle.set(ed.iframe, "display", "block");
				delete ed._sourceQueryCommandEnabled;

				//Trigger a check for command enablement/disablement.
				this.editor.onDisplayChanged();
			}
			// Call a delayed resize to wait for some things to display in header/footer.
			setTimeout(lang.hitch(this, function(){
				// Make resize calls.
				var parent = ed.domNode.parentNode;
				if(parent){
					var container = registry.getEnclosingWidget(parent);
					if(container && container.resize){
						container.resize();
					}
				}
                ed.resize();
			}), 300);
		}catch(e){
			console.log(e);
		}
	},

	updateState: function(){
		// summary:
		//		Over-ride for button state control for disabled to work.
		this.button.set("disabled", this.get("disabled"));
	},

	_resize: function(){
		// summary:
		//		Internal function to resize the source view
		// tags:
		//		private
		var ed = this.editor;
		var tbH = ed.getHeaderHeight();
		var fH = ed.getFooterHeight();
		var eb = domGeometry.position(ed.domNode);

		// Styles are now applied to the internal source container, so we have
		// to subtract them off.
		var containerPadding = domGeometry.getPadBorderExtents(ed.iframe.parentNode);
		var containerMargin = domGeometry.getMarginExtents(ed.iframe.parentNode);

		var extents = domGeometry.getPadBorderExtents(ed.domNode);
		var edb = {
			w: eb.w - extents.w,
			h: eb.h - (tbH + extents.h + fH)
		};

		// Fullscreen gets odd, so we need to check for the FS plugin and
		// adapt.
		if(this._fsPlugin && this._fsPlugin.isFullscreen){
			//Okay, probably in FS, adjust.
			var vp = winUtils.getBox(ed.ownerDocument);
			edb.w = (vp.w - extents.w);
			edb.h = (vp.h - (tbH + extents.h + fH));
		}

		if(has("ie")){
			// IE is always off by 2px, so we have to adjust here
			// Note that IE ZOOM is broken here.  I can't get
			//it to scale right.
			edb.h -= 2;
		}

		// IE has a horrible zoom bug.  So, we have to try and account for
		// it and fix up the scaling.
		if(this._ieFixNode){
			var _ie7zoom = -this._ieFixNode.offsetTop / 1000;
			edb.w = Math.floor((edb.w + 0.9) / _ie7zoom);
			edb.h = Math.floor((edb.h + 0.9) / _ie7zoom);
		}

		domGeometry.setMarginBox(this.sourceArea, {
			w: edb.w - (containerPadding.w + containerMargin.w),
			h: edb.h - (containerPadding.h + containerMargin.h)
		});

		// Scale the parent container too in this case.
		domGeometry.setMarginBox(ed.iframe.parentNode, {
			h: edb.h
		});
	},

	_createSourceView: function(){
		// summary:
		//		Internal function for creating the source view area.
		// tags:
		//		private
		var ed = this.editor;
		var edPlugins = ed._plugins;
		this.sourceArea = domConstruct.create("textarea");
		if(this.readOnly){
			domAttr.set(this.sourceArea, "readOnly", true);
			this._readOnly = true;
		}
		domStyle.set(this.sourceArea, {
			padding: "0px",
			margin: "0px",
			borderWidth: "0px",
			borderStyle: "none"
		});
		domConstruct.place(this.sourceArea, ed.iframe, "before");

		if(has("ie") && ed.iframe.parentNode.lastChild !== ed.iframe){
			// There's some weirdo div in IE used for focus control
			// But is messed up scaling the textarea if we don't config
			// it some so it doesn't have a varying height.
			domStyle.set(ed.iframe.parentNode.lastChild,{
				width: "0px",
				height: "0px",
				padding: "0px",
				margin: "0px",
				borderWidth: "0px",
				borderStyle: "none"
			});
		}

		// We also need to take over editor focus a bit here, so that focus calls to
		// focus the editor will focus to the right node when VS is active.
		ed._viewsource_oldFocus = ed.focus;
		var self = this;
		ed.focus = function(){
			if(self._sourceShown){
				self.setSourceAreaCaret();
			}else{
				try{
					if(this._vsFocused){
						delete this._vsFocused;
						// Must focus edit node in this case (webkit only) or
						// focus doesn't shift right, but in normal
						// cases we focus with the regular function.
						focus.focus(ed.editNode);
					}else{
						ed._viewsource_oldFocus();
					}
				}catch(e){
					console.log(e);
				}
			}
		};

		var i, p;
		for(i = 0; i < edPlugins.length; i++){
			// We actually do need to trap this plugin and adjust how we
			// display the textarea.
			p = edPlugins[i];
			if(p && (p.declaredClass === "dijit._editor.plugins.FullScreen" ||
					p.declaredClass === (dijit._scopeName +
					"._editor.plugins.FullScreen"))){
				this._fsPlugin = p;
				break;
			}
		}
		if(this._fsPlugin){
			// Found, we need to over-ride the alt-view node function
			// on FullScreen with our own, chain up to parent call when appropriate.
			this._fsPlugin._viewsource_getAltViewNode = this._fsPlugin._getAltViewNode;
			this._fsPlugin._getAltViewNode = function(){
				return self._sourceShown?self.sourceArea:this._viewsource_getAltViewNode();
			};
		}

		// Listen to the source area for key events as well, as we need to be able to hotkey toggle
		// it from there too.
		this.connect(this.sourceArea, "onkeydown", lang.hitch(this, function(e){
			if(this._sourceShown && e.keyCode == keys.F12 && e.ctrlKey && e.shiftKey){
				this.button.focus();
				this.button.set("checked", false);
				setTimeout(lang.hitch(this, function(){ed.focus();}), 100);
				event.stop(e);
			}
		}));
	},

	_stripScripts: function(html){
		// summary:
		//		Strips out script tags from the HTML used in editor.
		// html: String
		//		The HTML to filter
		// tags:
		//		private
		if(html){
			// Look for closed and unclosed (malformed) script attacks.
			html = html.replace(/<\s*script[^>]*>((.|\s)*?)<\\?\/\s*script\s*>/ig, "");
			html = html.replace(/<\s*script\b([^<>]|\s)*>?/ig, "");
			html = html.replace(/<[^>]*=(\s|)*[("|')]javascript:[^$1][(\s|.)]*[$1][^>]*>/ig, "");
		}
		return html;
	},

	_stripComments: function(html){
		// summary:
		//		Strips out comments from the HTML used in editor.
		// html: String
		//		The HTML to filter
		// tags:
		//		private
		if(html){
			html = html.replace(/<!--(.|\s){1,}?-->/g, "");
		}
		return html;
	},

	_stripIFrames: function(html){
		// summary:
		//		Strips out iframe tags from the content, to avoid iframe script
		//		style injection attacks.
		// html: String
		//		The HTML to filter
		// tags:
		//		private
		if(html){
			html = html.replace(/<\s*iframe[^>]*>((.|\s)*?)<\\?\/\s*iframe\s*>/ig, "");
		}
		return html;
	},

	_filter: function(html){
		// summary:
		//		Internal function to perform some filtering on the HTML.
		// html: String
		//		The HTML to filter
		// tags:
		//		private
		if(html){
			if(this.stripScripts){
				html = this._stripScripts(html);
			}
			if(this.stripComments){
				html = this._stripComments(html);
			}
			if(this.stripIFrames){
				html = this._stripIFrames(html);
			}
		}
		return html;
	},

	setSourceAreaCaret: function(){
		// summary:
		//		Internal function to set the caret in the sourceArea
		//		to 0x0
		var global = win.global;
		var elem = this.sourceArea;
		focus.focus(elem);
		if(this._sourceShown && !this.readOnly){
			if(has("ie")){
				if(this.sourceArea.createTextRange){
					var range = elem.createTextRange();
					range.collapse(true);
					range.moveStart("character", -99999); // move to 0
					range.moveStart("character", 0); // delta from 0 is the correct position
					range.moveEnd("character", 0);
					range.select();
				}
			}else if(global.getSelection){
				if(elem.setSelectionRange){
					elem.setSelectionRange(0,0);
				}
			}
		}
	},

	destroy: function(){
		// summary:
		//		Over-ride to remove the node used to correct for IE's
		//		zoom bug.
		if(this._ieFixNode){
			domConstruct.destroy(this._ieFixNode);
		}
		if(this._resizer){
			clearTimeout(this._resizer);
			delete this._resizer;
		}
		if(this._resizeHandle){
			this._resizeHandle.remove();
			delete this._resizeHandle;
		}
		if(this._setListener){
			this._setListener.remove();
			delete this._setListener;
		}
		this.inherited(arguments);
	}
});

// Register this plugin.
// For back-compat accept "viewsource" (all lowercase) too, remove in 2.0
_Plugin.registry["viewSource"] = _Plugin.registry["viewsource"] = function(args){
	return new ViewSource({
		readOnly: ("readOnly" in args)?args.readOnly:false,
		stripComments: ("stripComments" in args)?args.stripComments:true,
		stripScripts: ("stripScripts" in args)?args.stripScripts:true,
		stripIFrames: ("stripIFrames" in args)?args.stripIFrames:true
	});
};




return ViewSource;
});
