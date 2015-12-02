define([
	"dojo/_base/array", // array.forEach array.indexOf array.some
	"dojo/_base/config", // config
	"dojo/_base/declare", // declare
	"dojo/_base/Deferred", // Deferred
	"dojo/dom", // dom.byId
	"dojo/dom-attr", // domAttr.set or get
	"dojo/dom-class", // domClass.add domClass.remove
	"dojo/dom-construct", // domConstruct.create domConstruct.destroy domConstruct.place
	"dojo/dom-geometry", // domGeometry.position
	"dojo/dom-style", // domStyle.getComputedStyle domStyle.set
	"dojo/_base/kernel", // kernel.deprecated
	"dojo/keys", // keys.BACKSPACE keys.TAB
	"dojo/_base/lang", // lang.clone lang.hitch lang.isArray lang.isFunction lang.isString lang.trim
	"dojo/on", // on()
	"dojo/query", // query
	"dojo/domReady",
	"dojo/sniff", // has("ie") has("mozilla") has("opera") has("safari") has("webkit")
	"dojo/topic", // topic.publish() (publish)
	"dojo/_base/unload", // unload
	"dojo/_base/url", // url
	"dojo/window", // winUtils.get()
	"../_Widget",
	"../_CssStateMixin",
	"../selection",
	"./range",
	"./html",
	"../focus",
	"../main"    // dijit._scopeName
], function(array, config, declare, Deferred, dom, domAttr, domClass, domConstruct, domGeometry, domStyle,
			kernel, keys, lang, on, query, domReady, has, topic, unload, _Url, winUtils,
			_Widget, _CssStateMixin, selectionapi, rangeapi, htmlapi, focus, dijit){

	// module:
	//		dijit/_editor/RichText

	// If you want to allow for rich text saving with back/forward actions, you must add a text area to your page with
	// the id==dijit._scopeName + "._editor.RichText.value" (typically "dijit/_editor/RichText.value). For example,
	// something like this will work:
	//
	//	<textarea id="dijit._editor.RichText.value" style="display:none;position:absolute;top:-100px;left:-100px;height:3px;width:3px;overflow:hidden;"></textarea>

	var RichText = declare("dijit._editor.RichText", [_Widget, _CssStateMixin], {
		// summary:
		//		dijit/_editor/RichText is the core of dijit.Editor, which provides basic
		//		WYSIWYG editing features.
		//
		// description:
		//		dijit/_editor/RichText is the core of dijit.Editor, which provides basic
		//		WYSIWYG editing features. It also encapsulates the differences
		//		of different js engines for various browsers.  Do not use this widget
		//		with an HTML &lt;TEXTAREA&gt; tag, since the browser unescapes XML escape characters,
		//		like &lt;.  This can have unexpected behavior and lead to security issues
		//		such as scripting attacks.
		//
		// tags:
		//		private

		constructor: function(params /*===== , srcNodeRef =====*/){
			// summary:
			//		Create the widget.
			// params: Object|null
			//		Initial settings for any of the widget attributes, except readonly attributes.
			// srcNodeRef: DOMNode
			//		The widget replaces the specified DOMNode.

			// contentPreFilters: Function(String)[]
			//		Pre content filter function register array.
			//		these filters will be executed before the actual
			//		editing area gets the html content.
			this.contentPreFilters = [];

			// contentPostFilters: Function(String)[]
			//		post content filter function register array.
			//		These will be used on the resulting html
			//		from contentDomPostFilters. The resulting
			//		content is the final html (returned by getValue()).
			this.contentPostFilters = [];

			// contentDomPreFilters: Function(DomNode)[]
			//		Pre content dom filter function register array.
			//		These filters are applied after the result from
			//		contentPreFilters are set to the editing area.
			this.contentDomPreFilters = [];

			// contentDomPostFilters: Function(DomNode)[]
			//		Post content dom filter function register array.
			//		These filters are executed on the editing area dom.
			//		The result from these will be passed to contentPostFilters.
			this.contentDomPostFilters = [];

			// editingAreaStyleSheets: dojo._URL[]
			//		array to store all the stylesheets applied to the editing area
			this.editingAreaStyleSheets = [];

			// Make a copy of this.events before we start writing into it, otherwise we
			// will modify the prototype which leads to bad things on pages w/multiple editors
			this.events = [].concat(this.events);

			this._keyHandlers = {};

			if(params && lang.isString(params.value)){
				this.value = params.value;
			}

			this.onLoadDeferred = new Deferred();
		},

		baseClass: "dijitEditor",

		// inheritWidth: Boolean
		//		whether to inherit the parent's width or simply use 100%
		inheritWidth: false,

		// focusOnLoad: [deprecated] Boolean
		//		Focus into this widget when the page is loaded
		focusOnLoad: false,

		// name: String?
		//		Specifies the name of a (hidden) `<textarea>` node on the page that's used to save
		//		the editor content on page leave.   Used to restore editor contents after navigating
		//		to a new page and then hitting the back button.
		name: "",

		// styleSheets: [const] String
		//		semicolon (";") separated list of css files for the editing area
		styleSheets: "",

		// height: String
		//		Set height to fix the editor at a specific height, with scrolling.
		//		By default, this is 300px.  If you want to have the editor always
		//		resizes to accommodate the content, use AlwaysShowToolbar plugin
		//		and set height="".  If this editor is used within a layout widget,
		//		set height="100%".
		height: "300px",

		// minHeight: String
		//		The minimum height that the editor should have.
		minHeight: "1em",

		// isClosed: [private] Boolean
		isClosed: true,

		// isLoaded: [private] Boolean
		isLoaded: false,

		// _SEPARATOR: [private] String
		//		Used to concat contents from multiple editors into a single string,
		//		so they can be saved into a single `<textarea>` node.  See "name" attribute.
		_SEPARATOR: "@@**%%__RICHTEXTBOUNDRY__%%**@@",

		// _NAME_CONTENT_SEP: [private] String
		//		USed to separate name from content.  Just a colon isn't safe.
		_NAME_CONTENT_SEP: "@@**%%:%%**@@",

		// onLoadDeferred: [readonly] dojo/promise/Promise
		//		Deferred which is fired when the editor finishes loading.
		//		Call myEditor.onLoadDeferred.then(callback) it to be informed
		//		when the rich-text area initialization is finalized.
		onLoadDeferred: null,

		// isTabIndent: Boolean
		//		Make tab key and shift-tab indent and outdent rather than navigating.
		//		Caution: sing this makes web pages inaccessible to users unable to use a mouse.
		isTabIndent: false,

		// disableSpellCheck: [const] Boolean
		//		When true, disables the browser's native spell checking, if supported.
		//		Works only in Firefox.
		disableSpellCheck: false,

		postCreate: function(){
			if("textarea" === this.domNode.tagName.toLowerCase()){
				console.warn("RichText should not be used with the TEXTAREA tag.  See dijit._editor.RichText docs.");
			}

			// Push in the builtin filters now, making them the first executed, but not over-riding anything
			// users passed in.  See: #6062
			this.contentPreFilters = [
				lang.trim,	// avoid IE10 problem hitting ENTER on last line when there's a trailing \n.
				lang.hitch(this, "_preFixUrlAttributes")
			].concat(this.contentPreFilters);
			if(has("mozilla")){
				this.contentPreFilters = [this._normalizeFontStyle].concat(this.contentPreFilters);
				this.contentPostFilters = [this._removeMozBogus].concat(this.contentPostFilters);
			}
			if(has("webkit")){
				// Try to clean up WebKit bogus artifacts.  The inserted classes
				// made by WebKit sometimes messes things up.
				this.contentPreFilters = [this._removeWebkitBogus].concat(this.contentPreFilters);
				this.contentPostFilters = [this._removeWebkitBogus].concat(this.contentPostFilters);
			}
			if(has("ie") || has("trident")){
				// IE generates <strong> and <em> but we want to normalize to <b> and <i>
				// Still happens in IE11!
				this.contentPostFilters = [this._normalizeFontStyle].concat(this.contentPostFilters);
				this.contentDomPostFilters = [lang.hitch(this, "_stripBreakerNodes")].concat(this.contentDomPostFilters);
			}
			this.contentDomPostFilters = [lang.hitch(this, "_stripTrailingEmptyNodes")].concat(this.contentDomPostFilters);
			this.inherited(arguments);

			topic.publish(dijit._scopeName + "._editor.RichText::init", this);
		},

		startup: function(){
			this.inherited(arguments);

			// Don't call open() until startup() because we need to be attached to the DOM, and also if we are the
			// child of a StackContainer, let StackContainer._setupChild() do DOM manipulations before iframe is
			// created, to avoid duplicate onload call.
			this.open();
			this.setupDefaultShortcuts();
		},

		setupDefaultShortcuts: function(){
			// summary:
			//		Add some default key handlers
			// description:
			//		Overwrite this to setup your own handlers. The default
			//		implementation does not use Editor commands, but directly
			//		executes the builtin commands within the underlying browser
			//		support.
			// tags:
			//		protected
			var exec = lang.hitch(this, function(cmd, arg){
				return function(){
					return !this.execCommand(cmd, arg);
				};
			});

			var ctrlKeyHandlers = {
				b: exec("bold"),
				i: exec("italic"),
				u: exec("underline"),
				a: exec("selectall"),
				s: function(){
					this.save(true);
				},
				m: function(){
					this.isTabIndent = !this.isTabIndent;
				},

				"1": exec("formatblock", "h1"),
				"2": exec("formatblock", "h2"),
				"3": exec("formatblock", "h3"),
				"4": exec("formatblock", "h4"),

				"\\": exec("insertunorderedlist")
			};

			if(!has("ie")){
				ctrlKeyHandlers.Z = exec("redo"); //FIXME: undo?
			}

			var key;
			for(key in ctrlKeyHandlers){
				this.addKeyHandler(key, true, false, ctrlKeyHandlers[key]);
			}
		},

		// events: [private] String[]
		//		 events which should be connected to the underlying editing area
		events: ["onKeyDown", "onKeyUp"], // onClick handled specially

		// captureEvents: [deprecated] String[]
		//		 Events which should be connected to the underlying editing
		//		 area, events in this array will be addListener with
		//		 capture=true.
		// TODO: looking at the code I don't see any distinction between events and captureEvents,
		// so get rid of this for 2.0 if not sooner
		captureEvents: [],

		_editorCommandsLocalized: false,
		_localizeEditorCommands: function(){
			// summary:
			//		When IE is running in a non-English locale, the API actually changes,
			//		so that we have to say (for example) danraku instead of p (for paragraph).
			//		Handle that here.
			// tags:
			//		private
			if(RichText._editorCommandsLocalized){
				// Use the already generate cache of mappings.
				this._local2NativeFormatNames = RichText._local2NativeFormatNames;
				this._native2LocalFormatNames = RichText._native2LocalFormatNames;
				return;
			}
			RichText._editorCommandsLocalized = true;
			RichText._local2NativeFormatNames = {};
			RichText._native2LocalFormatNames = {};
			this._local2NativeFormatNames = RichText._local2NativeFormatNames;
			this._native2LocalFormatNames = RichText._native2LocalFormatNames;
			//in IE, names for blockformat is locale dependent, so we cache the values here

			//put p after div, so if IE returns Normal, we show it as paragraph
			//We can distinguish p and div if IE returns Normal, however, in order to detect that,
			//we have to call this.document.selection.createRange().parentElement() or such, which
			//could slow things down. Leave it as it is for now
			var formats = ['div', 'p', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ol', 'ul', 'address'];
			var localhtml = "", format, i = 0;
			while((format = formats[i++])){
				//append a <br> after each element to separate the elements more reliably
				if(format.charAt(1) !== 'l'){
					localhtml += "<" + format + "><span>content</span></" + format + "><br/>";
				}else{
					localhtml += "<" + format + "><li>content</li></" + format + "><br/>";
				}
			}
			// queryCommandValue returns empty if we hide editNode, so move it out of screen temporary
			// Also, IE9 does weird stuff unless we do it inside the editor iframe.
			var style = { position: "absolute", top: "0px", zIndex: 10, opacity: 0.01 };
			var div = domConstruct.create('div', {style: style, innerHTML: localhtml});
			this.ownerDocumentBody.appendChild(div);

			// IE9 has a timing issue with doing this right after setting
			// the inner HTML, so put a delay in.
			var inject = lang.hitch(this, function(){
				var node = div.firstChild;
				while(node){
					try{
						this.selection.selectElement(node.firstChild);
						var nativename = node.tagName.toLowerCase();
						this._local2NativeFormatNames[nativename] = document.queryCommandValue("formatblock");
						this._native2LocalFormatNames[this._local2NativeFormatNames[nativename]] = nativename;
						node = node.nextSibling.nextSibling;
						//console.log("Mapped: ", nativename, " to: ", this._local2NativeFormatNames[nativename]);
					}catch(e){ /*Sqelch the occasional IE9 error */
					}
				}
				domConstruct.destroy(div);
			});
			this.defer(inject);
		},

		open: function(/*DomNode?*/ element){
			// summary:
			//		Transforms the node referenced in this.domNode into a rich text editing
			//		node.
			// description:
			//		Sets up the editing area asynchronously. This will result in
			//		the creation and replacement with an iframe.
			// tags:
			//		private

			if(!this.onLoadDeferred || this.onLoadDeferred.fired >= 0){
				this.onLoadDeferred = new Deferred();
			}

			if(!this.isClosed){
				this.close();
			}
			topic.publish(dijit._scopeName + "._editor.RichText::open", this);

			if(arguments.length === 1 && element.nodeName){ // else unchanged
				this.domNode = element;
			}

			var dn = this.domNode;

			// Compute initial value of the editor
			var html;
			if(lang.isString(this.value)){
				// Allow setting the editor content programmatically instead of
				// relying on the initial content being contained within the target
				// domNode.
				html = this.value;
				dn.innerHTML = "";
			}else if(dn.nodeName && dn.nodeName.toLowerCase() == "textarea"){
				// if we were created from a textarea, then we need to create a
				// new editing harness node.
				var ta = (this.textarea = dn);
				this.name = ta.name;
				html = ta.value;
				dn = this.domNode = this.ownerDocument.createElement("div");
				dn.setAttribute('widgetId', this.id);
				ta.removeAttribute('widgetId');
				dn.cssText = ta.cssText;
				dn.className += " " + ta.className;
				domConstruct.place(dn, ta, "before");
				var tmpFunc = lang.hitch(this, function(){
					//some browsers refuse to submit display=none textarea, so
					//move the textarea off screen instead
					domStyle.set(ta, {
						display: "block",
						position: "absolute",
						top: "-1000px"
					});

					if(has("ie")){ //nasty IE bug: abnormal formatting if overflow is not hidden
						var s = ta.style;
						this.__overflow = s.overflow;
						s.overflow = "hidden";
					}
				});
				if(has("ie")){
					this.defer(tmpFunc, 10);
				}else{
					tmpFunc();
				}

				if(ta.form){
					var resetValue = ta.value;
					this.reset = function(){
						var current = this.getValue();
						if(current !== resetValue){
							this.replaceValue(resetValue);
						}
					};
					on(ta.form, "submit", lang.hitch(this, function(){
						// Copy value to the <textarea> so it gets submitted along with form.
						// FIXME: should we be calling close() here instead?
						domAttr.set(ta, 'disabled', this.disabled); // don't submit the value if disabled
						ta.value = this.getValue();
					}));
				}
			}else{
				html = htmlapi.getChildrenHtml(dn);
				dn.innerHTML = "";
			}
			this.value = html;

			// If we're a list item we have to put in a blank line to force the
			// bullet to nicely align at the top of text
			if(dn.nodeName && dn.nodeName === "LI"){
				dn.innerHTML = " <br>";
			}

			// Construct the editor div structure.
			this.header = dn.ownerDocument.createElement("div");
			dn.appendChild(this.header);
			this.editingArea = dn.ownerDocument.createElement("div");
			dn.appendChild(this.editingArea);
			this.footer = dn.ownerDocument.createElement("div");
			dn.appendChild(this.footer);

			if(!this.name){
				this.name = this.id + "_AUTOGEN";
			}

			// User has pressed back/forward button so we lost the text in the editor, but it's saved
			// in a hidden <textarea> (which contains the data for all the editors on this page),
			// so get editor value from there
			if(this.name !== "" && (!config["useXDomain"] || config["allowXdRichTextSave"])){
				var saveTextarea = dom.byId(dijit._scopeName + "._editor.RichText.value");
				if(saveTextarea && saveTextarea.value !== ""){
					var datas = saveTextarea.value.split(this._SEPARATOR), i = 0, dat;
					while((dat = datas[i++])){
						var data = dat.split(this._NAME_CONTENT_SEP);
						if(data[0] === this.name){
							this.value = data[1];
							datas = datas.splice(i, 1);
							saveTextarea.value = datas.join(this._SEPARATOR);
							break;
						}
					}
				}

				if(!RichText._globalSaveHandler){
					RichText._globalSaveHandler = {};
					unload.addOnUnload(function(){
						var id;
						for(id in RichText._globalSaveHandler){
							var f = RichText._globalSaveHandler[id];
							if(lang.isFunction(f)){
								f();
							}
						}
					});
				}
				RichText._globalSaveHandler[this.id] = lang.hitch(this, "_saveContent");
			}

			this.isClosed = false;

			var ifr = (this.editorObject = this.iframe = this.ownerDocument.createElement('iframe'));
			ifr.id = this.id + "_iframe";
			ifr.style.border = "none";
			ifr.style.width = "100%";
			if(this._layoutMode){
				// iframe should be 100% height, thus getting it's height from surrounding
				// <div> (which has the correct height set by Editor)
				ifr.style.height = "100%";
			}else{
				if(has("ie") >= 7){
					if(this.height){
						ifr.style.height = this.height;
					}
					if(this.minHeight){
						ifr.style.minHeight = this.minHeight;
					}
				}else{
					ifr.style.height = this.height ? this.height : this.minHeight;
				}
			}
			ifr.frameBorder = 0;
			ifr._loadFunc = lang.hitch(this, function(w){
				// This method is called when the editor is first loaded and also if the Editor's
				// dom node is repositioned. Unfortunately repositioning the Editor tends to
				// clear the iframe's contents, so we can't just no-op in that case.

				this.window = w;
				this.document = w.document;

				// instantiate class to access selected text in editor's iframe
				this.selection = new selectionapi.SelectionManager(w);

				if(has("ie")){
					this._localizeEditorCommands();
				}

				// Do final setup and set contents of editor.
				// Use get("value") rather than html in case _loadFunc() is being called for a second time
				// because editor's DOMNode was repositioned.
				this.onLoad(this.get("value"));
			});

			// Attach iframe to document, and set the initial (blank) content.
			var src = this._getIframeDocTxt().replace(/\\/g, "\\\\").replace(/'/g, "\\'"),
				s;

			// IE10 and earlier will throw an "Access is denied" error when attempting to access the parent frame if
			// document.domain has been set, unless the child frame also has the same document.domain set. In some
			// cases, we can only set document.domain while the document is being constructed using open/write/close;
			// attempting to set it later results in a different "This method can't be used in this context" error.
			// However, in at least IE9-10, sometimes the parent.window check will succeed and the access failure will
			// only happen later when trying to access frameElement, so there is an additional check and fix there
			// as well. See #17529
			if (has("ie") < 11) {
				s = 'javascript:document.open();try{parent.window;}catch(e){document.domain="' + document.domain + '";}' +
					'document.write(\'' + src + '\');document.close()';
			}
			else {
				s = "javascript: '" + src + "'";
			}

			if(has("ie") == 9){
				// On IE9, attach to document before setting the content, to avoid problem w/iframe running in
				// wrong security context, see #16633.
				this.editingArea.appendChild(ifr);
				ifr.src = s;
			}else{
				// For other browsers, set src first, especially for IE6/7 where attaching first gives a warning on
				// https:// about "this page contains secure and insecure items, do you want to view both?"
				ifr.setAttribute('src', s);
				this.editingArea.appendChild(ifr);
			}

			// TODO: this is a guess at the default line-height, kinda works
			if(dn.nodeName === "LI"){
				dn.lastChild.style.marginTop = "-1.2em";
			}

			domClass.add(this.domNode, this.baseClass);
		},

		//static cache variables shared among all instance of this class
		_local2NativeFormatNames: {},
		_native2LocalFormatNames: {},

		_getIframeDocTxt: function(){
			// summary:
			//		Generates the boilerplate text of the document inside the iframe (ie, `<html><head>...</head><body/></html>`).
			//		Editor content (if not blank) should be added afterwards.
			// tags:
			//		private
			var _cs = domStyle.getComputedStyle(this.domNode);

			// The contents inside of <body>.  The real contents are set later via a call to setValue().
			// In auto-expand mode, need a wrapper div for AlwaysShowToolbar plugin to correctly
			// expand/contract the editor as the content changes.
			var html = "<div id='dijitEditorBody'></div>";

			var font = [ _cs.fontWeight, _cs.fontSize, _cs.fontFamily ].join(" ");

			// line height is tricky - applying a units value will mess things up.
			// if we can't get a non-units value, bail out.
			var lineHeight = _cs.lineHeight;
			if(lineHeight.indexOf("px") >= 0){
				lineHeight = parseFloat(lineHeight) / parseFloat(_cs.fontSize);
				// console.debug(lineHeight);
			}else if(lineHeight.indexOf("em") >= 0){
				lineHeight = parseFloat(lineHeight);
			}else{
				// If we can't get a non-units value, just default
				// it to the CSS spec default of 'normal'.  Seems to
				// work better, esp on IE, than '1.0'
				lineHeight = "normal";
			}
			var userStyle = "";
			var self = this;
			this.style.replace(/(^|;)\s*(line-|font-?)[^;]+/ig, function(match){
				match = match.replace(/^;/ig, "") + ';';
				var s = match.split(":")[0];
				if(s){
					s = lang.trim(s);
					s = s.toLowerCase();
					var i;
					var sC = "";
					for(i = 0; i < s.length; i++){
						var c = s.charAt(i);
						switch(c){
							case "-":
								i++;
								c = s.charAt(i).toUpperCase();
							default:
								sC += c;
						}
					}
					domStyle.set(self.domNode, sC, "");
				}
				userStyle += match + ';';
			});


			// need to find any associated label element, aria-label, or aria-labelledby and update iframe document title
			var label = query('label[for="' + this.id + '"]');
			var title = "";
			if(label.length){
				title = label[0].innerHTML;
			}else if(this["aria-label"]){
				title = this["aria-label"];
			}else if(this["aria-labelledby"]){
				title = dom.byId(this["aria-labelledby"]).innerHTML;
			}

			// Now that we have the title, also set it as the title attribute on the iframe
			this.iframe.setAttribute("title", title);

			return [
				"<!DOCTYPE html>",
				this.isLeftToRight() ? "<html lang='" + this.lang + "'>\n<head>\n" : "<html dir='rtl' lang='" + this.lang + "'>\n<head>\n",
				title ? "<title>" + title + "</title>" : "",
				"<meta http-equiv='Content-Type' content='text/html'>\n",
				"<style>\n",
				"\tbody,html {\n",
				"\t\tbackground:transparent;\n",
				"\t\tpadding: 1px 0 0 0;\n",
				"\t\tmargin: -1px 0 0 0;\n", // remove extraneous vertical scrollbar on safari and firefox
				"\t}\n",
				"\tbody,html,#dijitEditorBody { outline: none; }",

				// Set <body> to expand to full size of editor, so clicking anywhere will work.
				// Except in auto-expand mode, in which case the editor expands to the size of <body>.
				// Also determine how scrollers should be applied.  In autoexpand mode (height = "") no scrollers on y at all.
				// But in fixed height mode we want both x/y scrollers.
				// Scrollers go on <body> since it's been set to height: 100%.
				"html { height: 100%; width: 100%; overflow: hidden; }\n",	// scroll bar is on #dijitEditorBody, shouldn't be on <html>
				this.height ? "\tbody,#dijitEditorBody { height: 100%; width: 100%; overflow: auto; }\n" :
					"\tbody,#dijitEditorBody { min-height: " + this.minHeight + "; width: 100%; overflow-x: auto; overflow-y: hidden; }\n",

				// TODO: left positioning will cause contents to disappear out of view
				//	   if it gets too wide for the visible area
				"\tbody{\n",
				"\t\ttop:0px;\n",
				"\t\tleft:0px;\n",
				"\t\tright:0px;\n",
				"\t\tfont:", font, ";\n",
				((this.height || has("opera")) ? "" : "\t\tposition: fixed;\n"),
				"\t\tline-height:", lineHeight, ";\n",
				"\t}\n",
				"\tp{ margin: 1em 0; }\n",

				"\tli > ul:-moz-first-node, li > ol:-moz-first-node{ padding-top: 1.2em; }\n",
				// Can't set min-height in IE>=9, it puts layout on li, which puts move/resize handles.
				(has("ie") || has("trident") ? "" : "\tli{ min-height:1.2em; }\n"),
				"</style>\n",
				this._applyEditingAreaStyleSheets(), "\n",
				"</head>\n<body role='main' ",

				// Onload handler fills in real editor content.
				// On IE9, sometimes onload is called twice, and the first time frameElement is null (test_FullScreen.html)
				// On IE9-10, it is also possible that accessing window.parent in the initial creation of the
				// iframe DOM will succeed, but trying to access window.frameElement will fail, in which case we
				// *can* set the domain without a "This method can't be used in this context" error. See #17529
				"onload='try{frameElement && frameElement._loadFunc(window,document)}catch(e){document.domain=\"" + document.domain + "\";frameElement._loadFunc(window,document)}' ",
				"style='" + userStyle + "'>", html, "</body>\n</html>"
			].join(""); // String
		},

		_applyEditingAreaStyleSheets: function(){
			// summary:
			//		apply the specified css files in styleSheets
			// tags:
			//		private
			var files = [];
			if(this.styleSheets){
				files = this.styleSheets.split(';');
				this.styleSheets = '';
			}

			//empty this.editingAreaStyleSheets here, as it will be filled in addStyleSheet
			files = files.concat(this.editingAreaStyleSheets);
			this.editingAreaStyleSheets = [];

			var text = '', i = 0, url, ownerWindow = winUtils.get(this.ownerDocument);
			while((url = files[i++])){
				var abstring = (new _Url(ownerWindow.location, url)).toString();
				this.editingAreaStyleSheets.push(abstring);
				text += '<link rel="stylesheet" type="text/css" href="' + abstring + '"/>';
			}
			return text;
		},

		addStyleSheet: function(/*dojo/_base/url*/ uri){
			// summary:
			//		add an external stylesheet for the editing area
			// uri:
			//		Url of the external css file
			var url = uri.toString(), ownerWindow = winUtils.get(this.ownerDocument);

			//if uri is relative, then convert it to absolute so that it can be resolved correctly in iframe
			if(url.charAt(0) === '.' || (url.charAt(0) !== '/' && !uri.host)){
				url = (new _Url(ownerWindow.location, url)).toString();
			}

			if(array.indexOf(this.editingAreaStyleSheets, url) > -1){
//			console.debug("dijit/_editor/RichText.addStyleSheet(): Style sheet "+url+" is already applied");
				return;
			}

			this.editingAreaStyleSheets.push(url);
			this.onLoadDeferred.then(lang.hitch(this, function(){
				if(this.document.createStyleSheet){ //IE
					this.document.createStyleSheet(url);
				}else{ //other browser
					var head = this.document.getElementsByTagName("head")[0];
					var stylesheet = this.document.createElement("link");
					stylesheet.rel = "stylesheet";
					stylesheet.type = "text/css";
					stylesheet.href = url;
					head.appendChild(stylesheet);
				}
			}));
		},

		removeStyleSheet: function(/*dojo/_base/url*/ uri){
			// summary:
			//		remove an external stylesheet for the editing area
			var url = uri.toString(), ownerWindow = winUtils.get(this.ownerDocument);
			//if uri is relative, then convert it to absolute so that it can be resolved correctly in iframe
			if(url.charAt(0) === '.' || (url.charAt(0) !== '/' && !uri.host)){
				url = (new _Url(ownerWindow.location, url)).toString();
			}
			var index = array.indexOf(this.editingAreaStyleSheets, url);
			if(index === -1){
//			console.debug("dijit/_editor/RichText.removeStyleSheet(): Style sheet "+url+" has not been applied");
				return;
			}
			delete this.editingAreaStyleSheets[index];
			query('link[href="' + url + '"]', this.window.document).orphan();
		},

		// disabled: Boolean
		//		The editor is disabled; the text cannot be changed.
		disabled: false,

		_mozSettingProps: {'styleWithCSS': false},
		_setDisabledAttr: function(/*Boolean*/ value){
			value = !!value;
			this._set("disabled", value);
			if(!this.isLoaded){
				return;
			} // this method requires init to be complete
			var preventIEfocus = has("ie") && (this.isLoaded || !this.focusOnLoad);
			if(preventIEfocus){
				this.editNode.unselectable = "on";
			}
			this.editNode.contentEditable = !value;
			this.editNode.tabIndex = value ? "-1" : this.tabIndex;
			if(preventIEfocus){
				this.defer(function(){
					if(this.editNode){        // guard in case widget destroyed before timeout
						this.editNode.unselectable = "off";
					}
				});
			}
			if(has("mozilla") && !value && this._mozSettingProps){
				var ps = this._mozSettingProps;
				var n;
				for(n in ps){
					if(ps.hasOwnProperty(n)){
						try{
							this.document.execCommand(n, false, ps[n]);
						}catch(e2){
						}
					}
				}
			}
			this._disabledOK = true;
		},

		/* Event handlers
		 *****************/

		onLoad: function(/*String*/ html){
			// summary:
			//		Handler after the iframe finishes loading.
			// html: String
			//		Editor contents should be set to this value
			// tags:
			//		protected

			if(!this.window.__registeredWindow){
				this.window.__registeredWindow = true;
				this._iframeRegHandle = focus.registerIframe(this.iframe);
			}

			// there's a wrapper div around the content, see _getIframeDocTxt().
			this.editNode = this.document.body.firstChild;
			var _this = this;

			// Helper code so IE and FF skip over focusing on the <iframe> and just focus on the inner <div>.
			// See #4996 IE wants to focus the BODY tag.
			this.beforeIframeNode = domConstruct.place("<div tabIndex=-1></div>", this.iframe, "before");
			this.afterIframeNode = domConstruct.place("<div tabIndex=-1></div>", this.iframe, "after");
			this.iframe.onfocus = this.document.onfocus = function(){
				_this.editNode.focus();
			};

			this.focusNode = this.editNode; // for InlineEditBox


			var events = this.events.concat(this.captureEvents);
			var ap = this.iframe ? this.document : this.editNode;
			this.own.apply(this,
				array.map(events, function(item){
					var type = item.toLowerCase().replace(/^on/, "");
					return on(ap, type, lang.hitch(this, item));
				}, this)
			);

			this.own(
				// mouseup in the margin does not generate an onclick event
				on(ap, "mouseup", lang.hitch(this, "onClick"))
			);

			if(has("ie")){ // IE contentEditable
				this.own(on(this.document, "mousedown", lang.hitch(this, "_onIEMouseDown"))); // #4996 fix focus

				// give the node Layout on IE
				// TODO: this may no longer be needed, since we've reverted IE to using an iframe,
				// not contentEditable.   Removing it would also probably remove the need for creating
				// the extra <div> in _getIframeDocTxt()
				this.editNode.style.zoom = 1.0;
			}

			if(has("webkit")){
				//WebKit sometimes doesn't fire right on selections, so the toolbar
				//doesn't update right.  Therefore, help it out a bit with an additional
				//listener.  A mouse up will typically indicate a display change, so fire this
				//and get the toolbar to adapt.  Reference: #9532
				this._webkitListener = this.own(on(this.document, "mouseup", lang.hitch(this, "onDisplayChanged")))[0];
				this.own(on(this.document, "mousedown", lang.hitch(this, function(e){
					var t = e.target;
					if(t && (t === this.document.body || t === this.document)){
						// Since WebKit uses the inner DIV, we need to check and set position.
						// See: #12024 as to why the change was made.
						this.defer("placeCursorAtEnd");
					}
				})));
			}

			if(has("ie")){
				// Try to make sure 'hidden' elements aren't visible in edit mode (like browsers other than IE
				// do).  See #9103
				try{
					this.document.execCommand('RespectVisibilityInDesign', true, null);
				}catch(e){/* squelch */
				}
			}

			this.isLoaded = true;

			this.set('disabled', this.disabled); // initialize content to editable (or not)

			// Note that setValue() call will only work after isLoaded is set to true (above)

			// Set up a function to allow delaying the setValue until a callback is fired
			// This ensures extensions like dijit.Editor have a way to hold the value set
			// until plugins load (and do things like register filters).
			var setContent = lang.hitch(this, function(){
				this.setValue(html);

				// Tell app that the Editor has finished loading.  isFulfilled() check avoids spurious
				// console warning when this function is called repeatedly because Editor DOMNode was moved.
				if(this.onLoadDeferred && !this.onLoadDeferred.isFulfilled()){
					this.onLoadDeferred.resolve(true);
				}

				this.onDisplayChanged();
				if(this.focusOnLoad){
					// after the document loads, then set focus after updateInterval expires so that
					// onNormalizedDisplayChanged has run to avoid input caret issues
					domReady(lang.hitch(this, "defer", "focus", this.updateInterval));
				}
				// Save off the initial content now
				this.value = this.getValue(true);
			});
			if(this.setValueDeferred){
				this.setValueDeferred.then(setContent);
			}else{
				setContent();
			}
		},

		onKeyDown: function(/* Event */ e){
			// summary:
			//		Handler for keydown event
			// tags:
			//		protected

			// Modifier keys should not cause the onKeyPressed event because they do not cause any change to the
			// display
			if(e.keyCode === keys.SHIFT ||
			   e.keyCode === keys.ALT ||
			   e.keyCode === keys.META ||
			   e.keyCode === keys.CTRL){
				return true;
			}

			if(e.keyCode === keys.TAB && this.isTabIndent){
				//prevent tab from moving focus out of editor
				e.stopPropagation();
				e.preventDefault();

				// FIXME: this is a poor-man's indent/outdent. It would be
				// better if it added 4 "&nbsp;" chars in an undoable way.
				// Unfortunately pasteHTML does not prove to be undoable
				if(this.queryCommandEnabled((e.shiftKey ? "outdent" : "indent"))){
					this.execCommand((e.shiftKey ? "outdent" : "indent"));
				}
			}

			// Make tab and shift-tab skip over the <iframe>, going from the nested <div> to the toolbar
			// or next element after the editor
			if(e.keyCode == keys.TAB && !this.isTabIndent && !e.ctrlKey && !e.altKey){
				if(e.shiftKey){
					// focus the <iframe> so the browser will shift-tab away from it instead
					this.beforeIframeNode.focus();
				}else{
					// focus node after the <iframe> so the browser will tab away from it instead
					this.afterIframeNode.focus();
				}

				// Prevent onKeyPressed from firing in order to avoid triggering a display change event when the
				// editor is tabbed away; this fixes toolbar controls being inappropriately disabled in IE9+
				return true;
			}

			if(has("ie") < 9 && e.keyCode === keys.BACKSPACE && this.document.selection.type === "Control"){
				// IE has a bug where if a non-text object is selected in the editor,
				// hitting backspace would act as if the browser's back button was
				// clicked instead of deleting the object. see #1069
				e.stopPropagation();
				e.preventDefault();
				this.execCommand("delete");
			}

			if(has("ff")){
				if(e.keyCode === keys.PAGE_UP || e.keyCode === keys.PAGE_DOWN){
					if(this.editNode.clientHeight >= this.editNode.scrollHeight){
						// Stop the event to prevent firefox from trapping the cursor when there is no scroll bar.
						e.preventDefault();
					}
				}
			}

			var handlers = this._keyHandlers[e.keyCode],
				args = arguments;

			if(handlers && !e.altKey){
				array.some(handlers, function(h){
					// treat meta- same as ctrl-, for benefit of mac users
					if(!(h.shift ^ e.shiftKey) && !(h.ctrl ^ (e.ctrlKey || e.metaKey))){
						if(!h.handler.apply(this, args)){
							e.preventDefault();
						}
						return true;
					}
				}, this);
			}

			// function call after the character has been inserted
			this.defer("onKeyPressed", 1);

			return true;
		},

		onKeyUp: function(/*===== e =====*/){
			// summary:
			//		Handler for onkeyup event
			// tags:
			//		callback
		},

		setDisabled: function(/*Boolean*/ disabled){
			// summary:
			//		Deprecated, use set('disabled', ...) instead.
			// tags:
			//		deprecated
			kernel.deprecated('dijit.Editor::setDisabled is deprecated', 'use dijit.Editor::attr("disabled",boolean) instead', 2.0);
			this.set('disabled', disabled);
		},
		_setValueAttr: function(/*String*/ value){
			// summary:
			//		Registers that attr("value", foo) should call setValue(foo)
			this.setValue(value);
		},
		_setDisableSpellCheckAttr: function(/*Boolean*/ disabled){
			if(this.document){
				domAttr.set(this.document.body, "spellcheck", !disabled);
			}else{
				// try again after the editor is finished loading
				this.onLoadDeferred.then(lang.hitch(this, function(){
					domAttr.set(this.document.body, "spellcheck", !disabled);
				}));
			}
			this._set("disableSpellCheck", disabled);
		},

		addKeyHandler: function(/*String|Number*/ key, /*Boolean*/ ctrl, /*Boolean*/ shift, /*Function*/ handler){
			// summary:
			//		Add a handler for a keyboard shortcut
			// tags:
			//		protected

			if(typeof key == "string"){
				// Something like Ctrl-B.  Since using keydown event, we need to convert string to a number.
				key = key.toUpperCase().charCodeAt(0);
			}

			if(!lang.isArray(this._keyHandlers[key])){
				this._keyHandlers[key] = [];
			}

			this._keyHandlers[key].push({
				shift: shift || false,
				ctrl: ctrl || false,
				handler: handler
			});
		},

		onKeyPressed: function(){
			// summary:
			//		Handler for after the user has pressed a key, and the display has been updated.
			//		(Runs on a timer so that it runs after the display is updated)
			// tags:
			//		private
			this.onDisplayChanged(/*e*/); // can't pass in e
		},

		onClick: function(/*Event*/ e){
			// summary:
			//		Handler for when the user clicks.
			// tags:
			//		private

			// console.info('onClick',this._tryDesignModeOn);
			this.onDisplayChanged(e);
		},

		_onIEMouseDown: function(){
			// summary:
			//		IE only to prevent 2 clicks to focus
			// tags:
			//		protected

			if(!this.focused && !this.disabled){
				this.focus();
			}
		},

		_onBlur: function(e){
			// summary:
			//		Called from focus manager when focus has moved away from this editor
			// tags:
			//		protected

			// Workaround IE problem when you blur the browser windows while an editor is focused: IE hangs
			// when you focus editor #1, blur the browser window, and then click editor #0.  See #16939.
			if(has("ie") || has("trident")){
				this.defer(function(){
					if(!focus.curNode){
						this.ownerDocumentBody.focus();
					}
				});
			}

			this.inherited(arguments);

			var newValue = this.getValue(true);
			if(newValue !== this.value){
				this.onChange(newValue);
			}
			this._set("value", newValue);
		},

		_onFocus: function(/*Event*/ e){
			// summary:
			//		Called from focus manager when focus has moved into this editor
			// tags:
			//		protected

			// console.info('_onFocus')
			if(!this.disabled){
				if(!this._disabledOK){
					this.set('disabled', false);
				}
				this.inherited(arguments);
			}
		},

		// TODO: remove in 2.0
		blur: function(){
			// summary:
			//		Remove focus from this instance.
			// tags:
			//		deprecated
			if(!has("ie") && this.window.document.documentElement && this.window.document.documentElement.focus){
				this.window.document.documentElement.focus();
			}else if(this.ownerDocumentBody.focus){
				this.ownerDocumentBody.focus();
			}
		},

		focus: function(){
			// summary:
			//		Move focus to this editor
			if(!this.isLoaded){
				this.focusOnLoad = true;
				return;
			}
			if(has("ie") < 9){
				//this.editNode.focus(); -> causes IE to scroll always (strict and quirks mode) to the top the Iframe
				// if we fire the event manually and let the browser handle the focusing, the latest
				// cursor position is focused like in FF
				this.iframe.fireEvent('onfocus', document.createEventObject()); // createEventObject/fireEvent only in IE < 11
			}else{
				// Firefox and chrome
				this.editNode.focus();
			}
		},

		// _lastUpdate: 0,
		updateInterval: 200,
		_updateTimer: null,
		onDisplayChanged: function(/*Event*/ /*===== e =====*/){
			// summary:
			//		This event will be fired every time the display context
			//		changes and the result needs to be reflected in the UI.
			// description:
			//		If you don't want to have update too often,
			//		onNormalizedDisplayChanged should be used instead
			// tags:
			//		private

			// var _t=new Date();
			if(this._updateTimer){
				this._updateTimer.remove();
			}
			this._updateTimer = this.defer("onNormalizedDisplayChanged", this.updateInterval);

			// Technically this should trigger a call to watch("value", ...) registered handlers,
			// but getValue() is too slow to call on every keystroke so we don't.
		},
		onNormalizedDisplayChanged: function(){
			// summary:
			//		This event is fired every updateInterval ms or more
			// description:
			//		If something needs to happen immediately after a
			//		user change, please use onDisplayChanged instead.
			// tags:
			//		private
			delete this._updateTimer;
		},
		onChange: function(/*===== newContent =====*/){
			// summary:
			//		This is fired if and only if the editor loses focus and
			//		the content is changed.
		},
		_normalizeCommand: function(/*String*/ cmd, /*Anything?*/argument){
			// summary:
			//		Used as the advice function to map our
			//		normalized set of commands to those supported by the target
			//		browser.
			// tags:
			//		private

			var command = cmd.toLowerCase();
			if(command === "formatblock"){
				if(has("safari") && argument === undefined){
					command = "heading";
				}
			}else if(command === "hilitecolor" && !has("mozilla")){
				command = "backcolor";
			}

			return command;
		},

		_qcaCache: {},
		queryCommandAvailable: function(/*String*/ command){
			// summary:
			//		Tests whether a command is supported by the host. Clients
			//		SHOULD check whether a command is supported before attempting
			//		to use it, behaviour for unsupported commands is undefined.
			// command:
			//		The command to test for
			// tags:
			//		private

			// memoizing version. See _queryCommandAvailable for computing version
			var ca = this._qcaCache[command];
			if(ca !== undefined){
				return ca;
			}
			return (this._qcaCache[command] = this._queryCommandAvailable(command));
		},

		_queryCommandAvailable: function(/*String*/ command){
			// summary:
			//		See queryCommandAvailable().
			// tags:
			//		private

			var ie = 1;
			var mozilla = 1 << 1;
			var webkit = 1 << 2;
			var opera = 1 << 3;

			function isSupportedBy(browsers){
				return {
					ie: Boolean(browsers & ie),
					mozilla: Boolean(browsers & mozilla),
					webkit: Boolean(browsers & webkit),
					opera: Boolean(browsers & opera)
				};
			}

			var supportedBy = null;

			switch(command.toLowerCase()){
				case "bold":
				case "italic":
				case "underline":
				case "subscript":
				case "superscript":
				case "fontname":
				case "fontsize":
				case "forecolor":
				case "hilitecolor":
				case "justifycenter":
				case "justifyfull":
				case "justifyleft":
				case "justifyright":
				case "delete":
				case "selectall":
				case "toggledir":
					supportedBy = isSupportedBy(mozilla | ie | webkit | opera);
					break;

				case "createlink":
				case "unlink":
				case "removeformat":
				case "inserthorizontalrule":
				case "insertimage":
				case "insertorderedlist":
				case "insertunorderedlist":
				case "indent":
				case "outdent":
				case "formatblock":
				case "inserthtml":
				case "undo":
				case "redo":
				case "strikethrough":
				case "tabindent":
					supportedBy = isSupportedBy(mozilla | ie | opera | webkit);
					break;

				case "blockdirltr":
				case "blockdirrtl":
				case "dirltr":
				case "dirrtl":
				case "inlinedirltr":
				case "inlinedirrtl":
					supportedBy = isSupportedBy(ie);
					break;
				case "cut":
				case "copy":
				case "paste":
					supportedBy = isSupportedBy(ie | mozilla | webkit | opera);
					break;

				case "inserttable":
					supportedBy = isSupportedBy(mozilla | ie);
					break;

				case "insertcell":
				case "insertcol":
				case "insertrow":
				case "deletecells":
				case "deletecols":
				case "deleterows":
				case "mergecells":
				case "splitcell":
					supportedBy = isSupportedBy(ie | mozilla);
					break;

				default:
					return false;
			}

			return ((has("ie") || has("trident")) && supportedBy.ie) ||
				(has("mozilla") && supportedBy.mozilla) ||
				(has("webkit") && supportedBy.webkit) ||
				(has("opera") && supportedBy.opera);	// Boolean return true if the command is supported, false otherwise
		},

		execCommand: function(/*String*/ command, argument){
			// summary:
			//		Executes a command in the Rich Text area
			// command:
			//		The command to execute
			// argument:
			//		An optional argument to the command
			// tags:
			//		protected
			var returnValue;

			//focus() is required for IE to work
			//In addition, focus() makes sure after the execution of
			//the command, the editor receives the focus as expected
			if(this.focused){
				// put focus back in the iframe, unless focus has somehow been shifted out of the editor completely
				this.focus();
			}

			command = this._normalizeCommand(command, argument);

			if(argument !== undefined){
				if(command === "heading"){
					throw new Error("unimplemented");
				}else if(command === "formatblock" && (has("ie") || has("trident"))){
					argument = '<' + argument + '>';
				}
			}

			//Check to see if we have any over-rides for commands, they will be functions on this
			//widget of the form _commandImpl.  If we don't, fall through to the basic native
			//exec command of the browser.
			var implFunc = "_" + command + "Impl";
			if(this[implFunc]){
				returnValue = this[implFunc](argument);
			}else{
				argument = arguments.length > 1 ? argument : null;
				if(argument || command !== "createlink"){
					returnValue = this.document.execCommand(command, false, argument);
				}
			}

			this.onDisplayChanged();
			return returnValue;
		},

		queryCommandEnabled: function(/*String*/ command){
			// summary:
			//		Check whether a command is enabled or not.
			// command:
			//		The command to execute
			// tags:
			//		protected
			if(this.disabled || !this._disabledOK){
				return false;
			}

			command = this._normalizeCommand(command);

			//Check to see if we have any over-rides for commands, they will be functions on this
			//widget of the form _commandEnabledImpl.  If we don't, fall through to the basic native
			//command of the browser.
			var implFunc = "_" + command + "EnabledImpl";

			if(this[implFunc]){
				return  this[implFunc](command);
			}else{
				return this._browserQueryCommandEnabled(command);
			}
		},

		queryCommandState: function(command){
			// summary:
			//		Check the state of a given command and returns true or false.
			// tags:
			//		protected

			if(this.disabled || !this._disabledOK){
				return false;
			}
			command = this._normalizeCommand(command);
			try{
				return this.document.queryCommandState(command);
			}catch(e){
				//Squelch, occurs if editor is hidden on FF 3 (and maybe others.)
				return false;
			}
		},

		queryCommandValue: function(command){
			// summary:
			//		Check the value of a given command. This matters most for
			//		custom selections and complex values like font value setting.
			// tags:
			//		protected

			if(this.disabled || !this._disabledOK){
				return false;
			}
			var r;
			command = this._normalizeCommand(command);
			if((has("ie") || has("trident")) && command === "formatblock"){
				r = this._native2LocalFormatNames[this.document.queryCommandValue(command)];
			}else if(has("mozilla") && command === "hilitecolor"){
				var oldValue;
				try{
					oldValue = this.document.queryCommandValue("styleWithCSS");
				}catch(e){
					oldValue = false;
				}
				this.document.execCommand("styleWithCSS", false, true);
				r = this.document.queryCommandValue(command);
				this.document.execCommand("styleWithCSS", false, oldValue);
			}else{
				r = this.document.queryCommandValue(command);
			}
			return r;
		},

		// Misc.

		_sCall: function(name, args){
			// summary:
			//		Deprecated, remove for 2.0.   New code should access this.selection directly.
			//		Run the named method of dijit/selection over the
			//		current editor instance's window, with the passed args.
			// tags:
			//		private deprecated

			return this.selection[name].apply(this.selection, args);
		},

		// FIXME: this is a TON of code duplication. Why?

		placeCursorAtStart: function(){
			// summary:
			//		Place the cursor at the start of the editing area.
			// tags:
			//		private

			this.focus();

			//see comments in placeCursorAtEnd
			var isvalid = false;
			if(has("mozilla")){
				// TODO:  Is this branch even necessary?
				var first = this.editNode.firstChild;
				while(first){
					if(first.nodeType === 3){
						if(first.nodeValue.replace(/^\s+|\s+$/g, "").length > 0){
							isvalid = true;
							this.selection.selectElement(first);
							break;
						}
					}else if(first.nodeType === 1){
						isvalid = true;
						var tg = first.tagName ? first.tagName.toLowerCase() : "";
						// Collapse before childless tags.
						if(/br|input|img|base|meta|area|basefont|hr|link/.test(tg)){
							this.selection.selectElement(first);
						}else{
							// Collapse inside tags with children.
							this.selection.selectElementChildren(first);
						}
						break;
					}
					first = first.nextSibling;
				}
			}else{
				isvalid = true;
				this.selection.selectElementChildren(this.editNode);
			}
			if(isvalid){
				this.selection.collapse(true);
			}
		},

		placeCursorAtEnd: function(){
			// summary:
			//		Place the cursor at the end of the editing area.
			// tags:
			//		private

			this.focus();

			//In mozilla, if last child is not a text node, we have to use
			// selectElementChildren on this.editNode.lastChild otherwise the
			// cursor would be placed at the end of the closing tag of
			//this.editNode.lastChild
			var isvalid = false;
			if(has("mozilla")){
				var last = this.editNode.lastChild;
				while(last){
					if(last.nodeType === 3){
						if(last.nodeValue.replace(/^\s+|\s+$/g, "").length > 0){
							isvalid = true;
							this.selection.selectElement(last);
							break;
						}
					}else if(last.nodeType === 1){
						isvalid = true;
						this.selection.selectElement(last.lastChild || last);
						break;
					}
					last = last.previousSibling;
				}
			}else{
				isvalid = true;
				this.selection.selectElementChildren(this.editNode);
			}
			if(isvalid){
				this.selection.collapse(false);
			}
		},

		getValue: function(/*Boolean?*/ nonDestructive){
			// summary:
			//		Return the current content of the editing area (post filters
			//		are applied).  Users should call get('value') instead.
			// nonDestructive:
			//		defaults to false. Should the post-filtering be run over a copy
			//		of the live DOM? Most users should pass "true" here unless they
			//		*really* know that none of the installed filters are going to
			//		mess up the editing session.
			// tags:
			//		private
			if(this.textarea){
				if(this.isClosed || !this.isLoaded){
					return this.textarea.value;
				}
			}

			return this.isLoaded ? this._postFilterContent(null, nonDestructive) : this.value;
		},
		_getValueAttr: function(){
			// summary:
			//		Hook to make attr("value") work
			return this.getValue(true);
		},

		setValue: function(/*String*/ html){
			// summary:
			//		This function sets the content. No undo history is preserved.
			//		Users should use set('value', ...) instead.
			// tags:
			//		deprecated

			// TODO: remove this and getValue() for 2.0, and move code to _setValueAttr()

			if(!this.isLoaded){
				// try again after the editor is finished loading
				this.onLoadDeferred.then(lang.hitch(this, function(){
					this.setValue(html);
				}));
				return;
			}
			if(this.textarea && (this.isClosed || !this.isLoaded)){
				this.textarea.value = html;
			}else{
				html = this._preFilterContent(html);
				var node = this.isClosed ? this.domNode : this.editNode;

				node.innerHTML = html;
				this._preDomFilterContent(node);
			}

			this.onDisplayChanged();
			this._set("value", this.getValue(true));
		},

		replaceValue: function(/*String*/ html){
			// summary:
			//		This function set the content while trying to maintain the undo stack
			//		(now only works fine with Moz, this is identical to setValue in all
			//		other browsers)
			// tags:
			//		protected

			if(this.isClosed){
				this.setValue(html);
			}else if(this.window && this.window.getSelection && !has("mozilla")){ // Safari
				// look ma! it's a totally f'd browser!
				this.setValue(html);
			}else if(this.window && this.window.getSelection){ // Moz
				html = this._preFilterContent(html);
				this.execCommand("selectall");
				this.execCommand("inserthtml", html);
				this._preDomFilterContent(this.editNode);
			}else if(this.document && this.document.selection){//IE
				//In IE, when the first element is not a text node, say
				//an <a> tag, when replacing the content of the editing
				//area, the <a> tag will be around all the content
				//so for now, use setValue for IE too
				this.setValue(html);
			}

			this._set("value", this.getValue(true));
		},

		_preFilterContent: function(/*String*/ html){
			// summary:
			//		Filter the input before setting the content of the editing
			//		area. DOM pre-filtering may happen after this
			//		string-based filtering takes place but as of 1.2, this is not
			//		guaranteed for operations such as the inserthtml command.
			// tags:
			//		private

			var ec = html;
			array.forEach(this.contentPreFilters, function(ef){
				if(ef){
					ec = ef(ec);
				}
			});
			return ec;
		},
		_preDomFilterContent: function(/*DomNode*/ dom){
			// summary:
			//		filter the input's live DOM. All filter operations should be
			//		considered to be "live" and operating on the DOM that the user
			//		will be interacting with in their editing session.
			// tags:
			//		private
			dom = dom || this.editNode;
			array.forEach(this.contentDomPreFilters, function(ef){
				if(ef && lang.isFunction(ef)){
					ef(dom);
				}
			}, this);
		},

		_postFilterContent: function(/*DomNode|DomNode[]|String?*/ dom, /*Boolean?*/ nonDestructive){
			// summary:
			//		filter the output after getting the content of the editing area
			//
			// description:
			//		post-filtering allows plug-ins and users to specify any number
			//		of transforms over the editor's content, enabling many common
			//		use-cases such as transforming absolute to relative URLs (and
			//		vice-versa), ensuring conformance with a particular DTD, etc.
			//		The filters are registered in the contentDomPostFilters and
			//		contentPostFilters arrays. Each item in the
			//		contentDomPostFilters array is a function which takes a DOM
			//		Node or array of nodes as its only argument and returns the
			//		same. It is then passed down the chain for further filtering.
			//		The contentPostFilters array behaves the same way, except each
			//		member operates on strings. Together, the DOM and string-based
			//		filtering allow the full range of post-processing that should
			//		be necessaray to enable even the most agressive of post-editing
			//		conversions to take place.
			//
			//		If nonDestructive is set to "true", the nodes are cloned before
			//		filtering proceeds to avoid potentially destructive transforms
			//		to the content which may still needed to be edited further.
			//		Once DOM filtering has taken place, the serialized version of
			//		the DOM which is passed is run through each of the
			//		contentPostFilters functions.
			//
			// dom:
			//		a node, set of nodes, which to filter using each of the current
			//		members of the contentDomPostFilters and contentPostFilters arrays.
			//
			// nonDestructive:
			//		defaults to "false". If true, ensures that filtering happens on
			//		a clone of the passed-in content and not the actual node
			//		itself.
			//
			// tags:
			//		private

			var ec;
			if(!lang.isString(dom)){
				dom = dom || this.editNode;
				if(this.contentDomPostFilters.length){
					if(nonDestructive){
						dom = lang.clone(dom);
					}
					array.forEach(this.contentDomPostFilters, function(ef){
						dom = ef(dom);
					});
				}
				ec = htmlapi.getChildrenHtml(dom);
			}else{
				ec = dom;
			}

			if(!lang.trim(ec.replace(/^\xA0\xA0*/, '').replace(/\xA0\xA0*$/, '')).length){
				ec = "";
			}

			array.forEach(this.contentPostFilters, function(ef){
				ec = ef(ec);
			});

			return ec;
		},

		_saveContent: function(){
			// summary:
			//		Saves the content in an onunload event if the editor has not been closed
			// tags:
			//		private

			var saveTextarea = dom.byId(dijit._scopeName + "._editor.RichText.value");
			if(saveTextarea){
				if(saveTextarea.value){
					saveTextarea.value += this._SEPARATOR;
				}
				saveTextarea.value += this.name + this._NAME_CONTENT_SEP + this.getValue(true);
			}
		},


		escapeXml: function(/*String*/ str, /*Boolean*/ noSingleQuotes){
			// summary:
			//		Adds escape sequences for special characters in XML.
			//		Optionally skips escapes for single quotes
			// tags:
			//		private

			str = str.replace(/&/gm, "&amp;").replace(/</gm, "&lt;").replace(/>/gm, "&gt;").replace(/"/gm, "&quot;");
			if(!noSingleQuotes){
				str = str.replace(/'/gm, "&#39;");
			}
			return str; // string
		},

		getNodeHtml: function(/* DomNode */ node){
			// summary:
			//		Deprecated.   Use dijit/_editor/html::_getNodeHtml() instead.
			// tags:
			//		deprecated
			kernel.deprecated('dijit.Editor::getNodeHtml is deprecated', 'use dijit/_editor/html::getNodeHtml instead', 2);
			return htmlapi.getNodeHtml(node); // String
		},

		getNodeChildrenHtml: function(/* DomNode */ dom){
			// summary:
			//		Deprecated.   Use dijit/_editor/html::getChildrenHtml() instead.
			// tags:
			//		deprecated
			kernel.deprecated('dijit.Editor::getNodeChildrenHtml is deprecated', 'use dijit/_editor/html::getChildrenHtml instead', 2);
			return htmlapi.getChildrenHtml(dom);
		},

		close: function(/*Boolean?*/ save){
			// summary:
			//		Kills the editor and optionally writes back the modified contents to the
			//		element from which it originated.
			// save:
			//		Whether or not to save the changes. If false, the changes are discarded.
			// tags:
			//		private

			if(this.isClosed){
				return;
			}

			if(!arguments.length){
				save = true;
			}
			if(save){
				this._set("value", this.getValue(true));
			}

			// line height is squashed for iframes
			// FIXME: why was this here? if(this.iframe){ this.domNode.style.lineHeight = null; }

			if(this.interval){
				clearInterval(this.interval);
			}

			if(this._webkitListener){
				// Cleanup of WebKit fix: #9532
				this._webkitListener.remove();
				delete this._webkitListener;
			}

			// Guard against memory leaks on IE (see #9268)
			if(has("ie")){
				this.iframe.onfocus = null;
			}
			this.iframe._loadFunc = null;

			if(this._iframeRegHandle){
				this._iframeRegHandle.remove();
				delete this._iframeRegHandle;
			}

			if(this.textarea){
				var s = this.textarea.style;
				s.position = "";
				s.left = s.top = "";
				if(has("ie")){
					s.overflow = this.__overflow;
					this.__overflow = null;
				}
				this.textarea.value = this.value;
				domConstruct.destroy(this.domNode);
				this.domNode = this.textarea;
			}else{
				// Note that this destroys the iframe
				this.domNode.innerHTML = this.value;
			}
			delete this.iframe;

			domClass.remove(this.domNode, this.baseClass);
			this.isClosed = true;
			this.isLoaded = false;

			delete this.editNode;
			delete this.focusNode;

			if(this.window && this.window._frameElement){
				this.window._frameElement = null;
			}

			this.window = null;
			this.document = null;
			this.editingArea = null;
			this.editorObject = null;
		},

		destroy: function(){
			if(!this.isClosed){
				this.close(false);
			}
			if(this._updateTimer){
				this._updateTimer.remove();
			}
			this.inherited(arguments);
			if(RichText._globalSaveHandler){
				delete RichText._globalSaveHandler[this.id];
			}
		},

		_removeMozBogus: function(/* String */ html){
			// summary:
			//		Post filter to remove unwanted HTML attributes generated by mozilla
			// tags:
			//		private
			return html.replace(/\stype="_moz"/gi, '').replace(/\s_moz_dirty=""/gi, '').replace(/_moz_resizing="(true|false)"/gi, ''); // String
		},
		_removeWebkitBogus: function(/* String */ html){
			// summary:
			//		Post filter to remove unwanted HTML attributes generated by webkit
			// tags:
			//		private
			html = html.replace(/\sclass="webkit-block-placeholder"/gi, '');
			html = html.replace(/\sclass="apple-style-span"/gi, '');
			// For some reason copy/paste sometime adds extra meta tags for charset on
			// webkit (chrome) on mac.They need to be removed.  See: #12007"
			html = html.replace(/<meta charset=\"utf-8\" \/>/gi, '');
			return html; // String
		},
		_normalizeFontStyle: function(/* String */ html){
			// summary:
			//		Convert 'strong' and 'em' to 'b' and 'i'.
			// description:
			//		Moz can not handle strong/em tags correctly, so to help
			//		mozilla and also to normalize output, convert them to 'b' and 'i'.
			//
			//		Note the IE generates 'strong' and 'em' rather than 'b' and 'i'
			// tags:
			//		private
			return html.replace(/<(\/)?strong([ \>])/gi, '<$1b$2')
				.replace(/<(\/)?em([ \>])/gi, '<$1i$2'); // String
		},

		_preFixUrlAttributes: function(/* String */ html){
			// summary:
			//		Pre-filter to do fixing to href attributes on `<a>` and `<img>` tags
			// tags:
			//		private
			return html.replace(/(?:(<a(?=\s).*?\shref=)("|')(.*?)\2)|(?:(<a\s.*?href=)([^"'][^ >]+))/gi,
				'$1$4$2$3$5$2 _djrealurl=$2$3$5$2')
				.replace(/(?:(<img(?=\s).*?\ssrc=)("|')(.*?)\2)|(?:(<img\s.*?src=)([^"'][^ >]+))/gi,
				'$1$4$2$3$5$2 _djrealurl=$2$3$5$2'); // String
		},

		/*****************************************************************************
		 The following functions implement HTML manipulation commands for various
		 browser/contentEditable implementations.  The goal of them is to enforce
		 standard behaviors of them.
		 ******************************************************************************/

		/*** queryCommandEnabled implementations ***/

		_browserQueryCommandEnabled: function(command){
			// summary:
			//		Implementation to call to the native queryCommandEnabled of the browser.
			// command:
			//		The command to check.
			// tags:
			//		protected
			if(!command){
				return false;
			}
			var elem = has("ie") < 9 ? this.document.selection.createRange() : this.document;
			try{
				return elem.queryCommandEnabled(command);
			}catch(e){
				return false;
			}
		},

		_createlinkEnabledImpl: function(/*===== argument =====*/){
			// summary:
			//		This function implements the test for if the create link
			//		command should be enabled or not.
			// argument:
			//		arguments to the exec command, if any.
			// tags:
			//		protected
			var enabled = true;
			if(has("opera")){
				var sel = this.window.getSelection();
				if(sel.isCollapsed){
					enabled = true;
				}else{
					enabled = this.document.queryCommandEnabled("createlink");
				}
			}else{
				enabled = this._browserQueryCommandEnabled("createlink");
			}
			return enabled;
		},

		_unlinkEnabledImpl: function(/*===== argument =====*/){
			// summary:
			//		This function implements the test for if the unlink
			//		command should be enabled or not.
			// argument:
			//		arguments to the exec command, if any.
			// tags:
			//		protected
			var enabled = true;
			if(has("mozilla") || has("webkit")){
				enabled = this.selection.hasAncestorElement("a");
			}else{
				enabled = this._browserQueryCommandEnabled("unlink");
			}
			return enabled;
		},

		_inserttableEnabledImpl: function(/*===== argument =====*/){
			// summary:
			//		This function implements the test for if the inserttable
			//		command should be enabled or not.
			// argument:
			//		arguments to the exec command, if any.
			// tags:
			//		protected
			var enabled = true;
			if(has("mozilla") || has("webkit")){
				enabled = true;
			}else{
				enabled = this._browserQueryCommandEnabled("inserttable");
			}
			return enabled;
		},

		_cutEnabledImpl: function(/*===== argument =====*/){
			// summary:
			//		This function implements the test for if the cut
			//		command should be enabled or not.
			// argument:
			//		arguments to the exec command, if any.
			// tags:
			//		protected
			var enabled = true;
			if(has("webkit")){
				// WebKit deems clipboard activity as a security threat and natively would return false
				var sel = this.window.getSelection();
				if(sel){
					sel = sel.toString();
				}
				enabled = !!sel;
			}else{
				enabled = this._browserQueryCommandEnabled("cut");
			}
			return enabled;
		},

		_copyEnabledImpl: function(/*===== argument =====*/){
			// summary:
			//		This function implements the test for if the copy
			//		command should be enabled or not.
			// argument:
			//		arguments to the exec command, if any.
			// tags:
			//		protected
			var enabled = true;
			if(has("webkit")){
				// WebKit deems clipboard activity as a security threat and natively would return false
				var sel = this.window.getSelection();
				if(sel){
					sel = sel.toString();
				}
				enabled = !!sel;
			}else{
				enabled = this._browserQueryCommandEnabled("copy");
			}
			return enabled;
		},

		_pasteEnabledImpl: function(/*===== argument =====*/){
			// summary:c
			//		This function implements the test for if the paste
			//		command should be enabled or not.
			// argument:
			//		arguments to the exec command, if any.
			// tags:
			//		protected
			var enabled = true;
			if(has("webkit")){
				return true;
			}else{
				enabled = this._browserQueryCommandEnabled("paste");
			}
			return enabled;
		},

		/*** execCommand implementations ***/

		_inserthorizontalruleImpl: function(argument){
			// summary:
			//		This function implements the insertion of HTML 'HR' tags.
			//		into a point on the page.  IE doesn't to it right, so
			//		we have to use an alternate form
			// argument:
			//		arguments to the exec command, if any.
			// tags:
			//		protected
			if(has("ie")){
				return this._inserthtmlImpl("<hr>");
			}
			return this.document.execCommand("inserthorizontalrule", false, argument);
		},

		_unlinkImpl: function(argument){
			// summary:
			//		This function implements the unlink of an 'a' tag.
			// argument:
			//		arguments to the exec command, if any.
			// tags:
			//		protected
			if((this.queryCommandEnabled("unlink")) && (has("mozilla") || has("webkit"))){
				var a = this.selection.getAncestorElement("a");
				this.selection.selectElement(a);
				return this.document.execCommand("unlink", false, null);
			}
			return this.document.execCommand("unlink", false, argument);
		},

		_hilitecolorImpl: function(argument){
			// summary:
			//		This function implements the hilitecolor command
			// argument:
			//		arguments to the exec command, if any.
			// tags:
			//		protected
			var returnValue;
			var isApplied = this._handleTextColorOrProperties("hilitecolor", argument);
			if(!isApplied){
				if(has("mozilla")){
					// mozilla doesn't support hilitecolor properly when useCSS is
					// set to false (bugzilla #279330)
					this.document.execCommand("styleWithCSS", false, true);
					console.log("Executing color command.");
					returnValue = this.document.execCommand("hilitecolor", false, argument);
					this.document.execCommand("styleWithCSS", false, false);
				}else{
					returnValue = this.document.execCommand("hilitecolor", false, argument);
				}
			}
			return returnValue;
		},

		_backcolorImpl: function(argument){
			// summary:
			//		This function implements the backcolor command
			// argument:
			//		arguments to the exec command, if any.
			// tags:
			//		protected
			if(has("ie")){
				// Tested under IE 6 XP2, no problem here, comment out
				// IE weirdly collapses ranges when we exec these commands, so prevent it
				//	var tr = this.document.selection.createRange();
				argument = argument ? argument : null;
			}
			var isApplied = this._handleTextColorOrProperties("backcolor", argument);
			if(!isApplied){
				isApplied = this.document.execCommand("backcolor", false, argument);
			}
			return isApplied;
		},

		_forecolorImpl: function(argument){
			// summary:
			//		This function implements the forecolor command
			// argument:
			//		arguments to the exec command, if any.
			// tags:
			//		protected
			if(has("ie")){
				// Tested under IE 6 XP2, no problem here, comment out
				// IE weirdly collapses ranges when we exec these commands, so prevent it
				//	var tr = this.document.selection.createRange();
				argument = argument ? argument : null;
			}
			var isApplied = false;
			isApplied = this._handleTextColorOrProperties("forecolor", argument);
			if(!isApplied){
				isApplied = this.document.execCommand("forecolor", false, argument);
			}
			return isApplied;
		},

		_inserthtmlImpl: function(argument){
			// summary:
			//		This function implements the insertion of HTML content into
			//		a point on the page.
			// argument:
			//		The content to insert, if any.
			// tags:
			//		protected
			argument = this._preFilterContent(argument);
			var rv = true;
			if(has("ie") < 9){
				var insertRange = this.document.selection.createRange();
				if(this.document.selection.type.toUpperCase() === 'CONTROL'){
					var n = insertRange.item(0);
					while(insertRange.length){
						insertRange.remove(insertRange.item(0));
					}
					n.outerHTML = argument;
				}else{
					insertRange.pasteHTML(argument);
				}
				insertRange.select();
			}else if(has("trident") < 8){
				var insertRange;
				var selection = rangeapi.getSelection(this.window);
				if(selection && selection.rangeCount && selection.getRangeAt){
					insertRange = selection.getRangeAt(0);
					insertRange.deleteContents();

					var div = domConstruct.create('div');
					div.innerHTML = argument;
					var node, lastNode;
					var n = this.document.createDocumentFragment();
					while((node = div.firstChild)){
						lastNode = n.appendChild(node);
					}
					insertRange.insertNode(n);
					if(lastNode) {
						insertRange = insertRange.cloneRange();
						insertRange.setStartAfter(lastNode);
						insertRange.collapse(false);
						selection.removeAllRanges();
						selection.addRange(insertRange);
					}
				}
			}else if(has("mozilla") && !argument.length){
				//mozilla can not inserthtml an empty html to delete current selection
				//so we delete the selection instead in this case
				this.selection.remove(); // FIXME
			}else{
				rv = this.document.execCommand("inserthtml", false, argument);
			}
			return rv;
		},

		_boldImpl: function(argument){
			// summary:
			//		This function implements an over-ride of the bold command.
			// argument:
			//		Not used, operates by selection.
			// tags:
			//		protected
			var applied = false;
			if(has("ie") || has("trident")){
				this._adaptIESelection();
				applied = this._adaptIEFormatAreaAndExec("bold");
			}
			if(!applied){
				applied = this.document.execCommand("bold", false, argument);
			}
			return applied;
		},

		_italicImpl: function(argument){
			// summary:
			//		This function implements an over-ride of the italic command.
			// argument:
			//		Not used, operates by selection.
			// tags:
			//		protected
			var applied = false;
			if(has("ie") || has("trident")){
				this._adaptIESelection();
				applied = this._adaptIEFormatAreaAndExec("italic");
			}
			if(!applied){
				applied = this.document.execCommand("italic", false, argument);
			}
			return applied;
		},

		_underlineImpl: function(argument){
			// summary:
			//		This function implements an over-ride of the underline command.
			// argument:
			//		Not used, operates by selection.
			// tags:
			//		protected
			var applied = false;
			if(has("ie") || has("trident")){
				this._adaptIESelection();
				applied = this._adaptIEFormatAreaAndExec("underline");
			}
			if(!applied){
				applied = this.document.execCommand("underline", false, argument);
			}
			return applied;
		},

		_strikethroughImpl: function(argument){
			// summary:
			//		This function implements an over-ride of the strikethrough command.
			// argument:
			//		Not used, operates by selection.
			// tags:
			//		protected
			var applied = false;
			if(has("ie") || has("trident")){
				this._adaptIESelection();
				applied = this._adaptIEFormatAreaAndExec("strikethrough");
			}
			if(!applied){
				applied = this.document.execCommand("strikethrough", false, argument);
			}
			return applied;
		},

		_superscriptImpl: function(argument){
			// summary:
			//		This function implements an over-ride of the superscript command.
			// argument:
			//		Not used, operates by selection.
			// tags:
			//		protected
			var applied = false;
			if(has("ie") || has("trident")){
				this._adaptIESelection();
				applied = this._adaptIEFormatAreaAndExec("superscript");
			}
			if(!applied){
				applied = this.document.execCommand("superscript", false, argument);
			}
			return applied;
		},

		_subscriptImpl: function(argument){
			// summary:
			//		This function implements an over-ride of the superscript command.
			// argument:
			//		Not used, operates by selection.
			// tags:
			//		protected
			var applied = false;
			if(has("ie") || has("trident")){
				this._adaptIESelection();
				applied = this._adaptIEFormatAreaAndExec("subscript");

			}
			if(!applied){
				applied = this.document.execCommand("subscript", false, argument);
			}
			return applied;
		},

		_fontnameImpl: function(argument){
			// summary:
			//		This function implements the fontname command
			// argument:
			//		arguments to the exec command, if any.
			// tags:
			//		protected
			var isApplied;
			if(has("ie") || has("trident")){
				isApplied = this._handleTextColorOrProperties("fontname", argument);
			}
			if(!isApplied){
				isApplied = this.document.execCommand("fontname", false, argument);
			}
			return isApplied;
		},

		_fontsizeImpl: function(argument){
			// summary:
			//		This function implements the fontsize command
			// argument:
			//		arguments to the exec command, if any.
			// tags:
			//		protected
			var isApplied;
			if(has("ie") || has("trident")){
				isApplied = this._handleTextColorOrProperties("fontsize", argument);
			}
			if(!isApplied){
				isApplied = this.document.execCommand("fontsize", false, argument);
			}
			return isApplied;
		},

		_insertorderedlistImpl: function(argument){
			// summary:
			//		This function implements the insertorderedlist command
			// argument:
			//		arguments to the exec command, if any.
			// tags:
			//		protected
			var applied = false;
			if(has("ie") || has("trident")){
				applied = this._adaptIEList("insertorderedlist", argument);
			}
			if(!applied){
				applied = this.document.execCommand("insertorderedlist", false, argument);
			}
			return applied;
		},

		_insertunorderedlistImpl: function(argument){
			// summary:
			//		This function implements the insertunorderedlist command
			// argument:
			//		arguments to the exec command, if any.
			// tags:
			//		protected
			var applied = false;
			if(has("ie") || has("trident")){
				applied = this._adaptIEList("insertunorderedlist", argument);
			}
			if(!applied){
				applied = this.document.execCommand("insertunorderedlist", false, argument);
			}
			return applied;
		},

		getHeaderHeight: function(){
			// summary:
			//		A function for obtaining the height of the header node
			return this._getNodeChildrenHeight(this.header); // Number
		},

		getFooterHeight: function(){
			// summary:
			//		A function for obtaining the height of the footer node
			return this._getNodeChildrenHeight(this.footer); // Number
		},

		_getNodeChildrenHeight: function(node){
			// summary:
			//		An internal function for computing the cumulative height of all child nodes of 'node'
			// node:
			//		The node to process the children of;
			var h = 0;
			if(node && node.childNodes){
				// IE didn't compute it right when position was obtained on the node directly is some cases,
				// so we have to walk over all the children manually.
				var i;
				for(i = 0; i < node.childNodes.length; i++){
					var size = domGeometry.position(node.childNodes[i]);
					h += size.h;
				}
			}
			return h; // Number
		},

		_isNodeEmpty: function(node, startOffset){
			// summary:
			//		Function to test if a node is devoid of real content.
			// node:
			//		The node to check.
			// tags:
			//		private.
			if(node.nodeType === 1/*element*/){
				if(node.childNodes.length > 0){
					return this._isNodeEmpty(node.childNodes[0], startOffset);	// huh?   why test just first child?
				}
				return true;
			}else if(node.nodeType === 3/*text*/){
				return (node.nodeValue.substring(startOffset) === "");
			}
			return false;
		},

		_removeStartingRangeFromRange: function(node, range){
			// summary:
			//		Function to adjust selection range by removing the current
			//		start node.
			// node:
			//		The node to remove from the starting range.
			// range:
			//		The range to adapt.
			// tags:
			//		private
			if(node.nextSibling){
				range.setStart(node.nextSibling, 0);
			}else{
				var parent = node.parentNode;
				while(parent && parent.nextSibling == null){
					//move up the tree until we find a parent that has another node, that node will be the next node
					parent = parent.parentNode;
				}
				if(parent){
					range.setStart(parent.nextSibling, 0);
				}
			}
			return range;
		},

		_adaptIESelection: function(){
			// summary:
			//		Function to adapt the IE range by removing leading 'newlines'
			//		Needed to fix issue with bold/italics/underline not working if
			//		range included leading 'newlines'.
			//		In IE, if a user starts a selection at the very end of a line,
			//		then the native browser commands will fail to execute correctly.
			//		To work around the issue,  we can remove all empty nodes from
			//		the start of the range selection.
			var selection = rangeapi.getSelection(this.window);
			if(selection && selection.rangeCount && !selection.isCollapsed){
				var range = selection.getRangeAt(0);
				var firstNode = range.startContainer;
				var startOffset = range.startOffset;

				while(firstNode.nodeType === 3/*text*/ && startOffset >= firstNode.length && firstNode.nextSibling){
					//traverse the text nodes until we get to the one that is actually highlighted
					startOffset = startOffset - firstNode.length;
					firstNode = firstNode.nextSibling;
				}

				//Remove the starting ranges until the range does not start with an empty node.
				var lastNode = null;
				while(this._isNodeEmpty(firstNode, startOffset) && firstNode !== lastNode){
					lastNode = firstNode; //this will break the loop in case we can't find the next sibling
					range = this._removeStartingRangeFromRange(firstNode, range); //move the start container to the next node in the range
					firstNode = range.startContainer;
					startOffset = 0; //start at the beginning of the new starting range
				}
				selection.removeAllRanges();// this will work as long as users cannot select multiple ranges. I have not been able to do that in the editor.
				selection.addRange(range);
			}
		},

		_adaptIEFormatAreaAndExec: function(command){
			// summary:
			//		Function to handle IE's quirkiness regarding how it handles
			//		format commands on a word.  This involves a lit of node splitting
			//		and format cloning.
			// command:
			//		The format command, needed to check if the desired
			//		command is true or not.
			var selection = rangeapi.getSelection(this.window);
			var doc = this.document;
			var rs, ret, range, txt, startNode, endNode, breaker, sNode;
			if(command && selection && selection.isCollapsed){
				var isApplied = this.queryCommandValue(command);
				if(isApplied){

					// We have to split backwards until we hit the format
					var nNames = this._tagNamesForCommand(command);
					range = selection.getRangeAt(0);
					var fs = range.startContainer;
					if(fs.nodeType === 3){
						var offset = range.endOffset;
						if(fs.length < offset){
							//We are not looking from the right node, try to locate the correct one
							ret = this._adjustNodeAndOffset(rs, offset);
							fs = ret.node;
							offset = ret.offset;
						}
					}
					var topNode;
					while(fs && fs !== this.editNode){
						// We have to walk back and see if this is still a format or not.
						// Hm, how do I do this?
						var tName = fs.tagName ? fs.tagName.toLowerCase() : "";
						if(array.indexOf(nNames, tName) > -1){
							topNode = fs;
							break;
						}
						fs = fs.parentNode;
					}

					// Okay, we have a stopping place, time to split things apart.
					if(topNode){
						// Okay, we know how far we have to split backwards, so we have to split now.
						rs = range.startContainer;
						var newblock = doc.createElement(topNode.tagName);
						domConstruct.place(newblock, topNode, "after");
						if(rs && rs.nodeType === 3){
							// Text node, we have to split it.
							var nodeToMove, tNode;
							var endOffset = range.endOffset;
							if(rs.length < endOffset){
								//We are not splitting the right node, try to locate the correct one
								ret = this._adjustNodeAndOffset(rs, endOffset);
								rs = ret.node;
								endOffset = ret.offset;
							}

							txt = rs.nodeValue;
							startNode = doc.createTextNode(txt.substring(0, endOffset));
							var endText = txt.substring(endOffset, txt.length);
							if(endText){
								endNode = doc.createTextNode(endText);
							}
							// Place the split, then remove original nodes.
							domConstruct.place(startNode, rs, "before");
							if(endNode){
								breaker = doc.createElement("span");
								breaker.className = "ieFormatBreakerSpan";
								domConstruct.place(breaker, rs, "after");
								domConstruct.place(endNode, breaker, "after");
								endNode = breaker;
							}
							domConstruct.destroy(rs);

							// Okay, we split the text.  Now we need to see if we're
							// parented to the block element we're splitting and if
							// not, we have to split all the way up.  Ugh.
							var parentC = startNode.parentNode;
							var tagList = [];
							var tagData;
							while(parentC !== topNode){
								var tg = parentC.tagName;
								tagData = {tagName: tg};
								tagList.push(tagData);

								var newTg = doc.createElement(tg);
								// Clone over any 'style' data.
								if(parentC.style){
									if(newTg.style){
										if(parentC.style.cssText){
											newTg.style.cssText = parentC.style.cssText;
											tagData.cssText = parentC.style.cssText;
										}
									}
								}
								// If font also need to clone over any font data.
								if(parentC.tagName === "FONT"){
									if(parentC.color){
										newTg.color = parentC.color;
										tagData.color = parentC.color;
									}
									if(parentC.face){
										newTg.face = parentC.face;
										tagData.face = parentC.face;
									}
									if(parentC.size){  // this check was necessary on IE
										newTg.size = parentC.size;
										tagData.size = parentC.size;
									}
								}
								if(parentC.className){
									newTg.className = parentC.className;
									tagData.className = parentC.className;
								}

								// Now move end node and every sibling
								// after it over into the new tag.
								if(endNode){
									nodeToMove = endNode;
									while(nodeToMove){
										tNode = nodeToMove.nextSibling;
										newTg.appendChild(nodeToMove);
										nodeToMove = tNode;
									}
								}
								if(newTg.tagName == parentC.tagName){
									breaker = doc.createElement("span");
									breaker.className = "ieFormatBreakerSpan";
									domConstruct.place(breaker, parentC, "after");
									domConstruct.place(newTg, breaker, "after");
								}else{
									domConstruct.place(newTg, parentC, "after");
								}
								startNode = parentC;
								endNode = newTg;
								parentC = parentC.parentNode;
							}

							// Lastly, move the split out all the split tags
							// to the new block as they should now be split properly.
							if(endNode){
								nodeToMove = endNode;
								if(nodeToMove.nodeType === 1 || (nodeToMove.nodeType === 3 && nodeToMove.nodeValue)){
									// Non-blank text and non-text nodes need to clear out that blank space
									// before moving the contents.
									newblock.innerHTML = "";
								}
								while(nodeToMove){
									tNode = nodeToMove.nextSibling;
									newblock.appendChild(nodeToMove);
									nodeToMove = tNode;
								}
							}

							// We had intermediate tags, we have to now recreate them inbetween the split
							// and restore what styles, classnames, etc, we can.
							var newrange;
							if(tagList.length){
								tagData = tagList.pop();
								var newContTag = doc.createElement(tagData.tagName);
								if(tagData.cssText && newContTag.style){
									newContTag.style.cssText = tagData.cssText;
								}
								if(tagData.className){
									newContTag.className = tagData.className;
								}
								if(tagData.tagName === "FONT"){
									if(tagData.color){
										newContTag.color = tagData.color;
									}
									if(tagData.face){
										newContTag.face = tagData.face;
									}
									if(tagData.size){
										newContTag.size = tagData.size;
									}
								}
								domConstruct.place(newContTag, newblock, "before");
								while(tagList.length){
									tagData = tagList.pop();
									var newTgNode = doc.createElement(tagData.tagName);
									if(tagData.cssText && newTgNode.style){
										newTgNode.style.cssText = tagData.cssText;
									}
									if(tagData.className){
										newTgNode.className = tagData.className;
									}
									if(tagData.tagName === "FONT"){
										if(tagData.color){
											newTgNode.color = tagData.color;
										}
										if(tagData.face){
											newTgNode.face = tagData.face;
										}
										if(tagData.size){
											newTgNode.size = tagData.size;
										}
									}
									newContTag.appendChild(newTgNode);
									newContTag = newTgNode;
								}

								// Okay, everything is theoretically split apart and removed from the content
								// so insert the dummy text to select, select it, then
								// clear to position cursor.
								sNode = doc.createTextNode(".");
								breaker.appendChild(sNode);
								newContTag.appendChild(sNode);
								newrange = rangeapi.create(this.window);
								newrange.setStart(sNode, 0);
								newrange.setEnd(sNode, sNode.length);
								selection.removeAllRanges();
								selection.addRange(newrange);
								this.selection.collapse(false);
								sNode.parentNode.innerHTML = "";
							}else{
								// No extra tags, so we have to insert a breaker point and rely
								// on filters to remove it later.
								breaker = doc.createElement("span");
								breaker.className = "ieFormatBreakerSpan";
								sNode = doc.createTextNode(".");
								breaker.appendChild(sNode);
								domConstruct.place(breaker, newblock, "before");
								newrange = rangeapi.create(this.window);
								newrange.setStart(sNode, 0);
								newrange.setEnd(sNode, sNode.length);
								selection.removeAllRanges();
								selection.addRange(newrange);
								this.selection.collapse(false);
								sNode.parentNode.innerHTML = "";
							}
							if(!newblock.firstChild){
								// Empty, we don't need it.  Split was at end or similar
								// So, remove it.
								domConstruct.destroy(newblock);
							}
							return true;
						}
					}
					return false;
				}else{
					range = selection.getRangeAt(0);
					rs = range.startContainer;
					if(rs && rs.nodeType === 3){
						// Text node, we have to split it.
						var offset = range.startOffset;
						if(rs.length < offset){
							//We are not splitting the right node, try to locate the correct one
							ret = this._adjustNodeAndOffset(rs, offset);
							rs = ret.node;
							offset = ret.offset;
						}
						txt = rs.nodeValue;
						startNode = doc.createTextNode(txt.substring(0, offset));
						var endText = txt.substring(offset);
						if(endText !== ""){
							endNode = doc.createTextNode(txt.substring(offset));
						}
						// Create a space, we'll select and bold it, so
						// the whole word doesn't get bolded
						breaker = doc.createElement("span");
						sNode = doc.createTextNode(".");
						breaker.appendChild(sNode);
						if(startNode.length){
							domConstruct.place(startNode, rs, "after");
						}else{
							startNode = rs;
						}
						domConstruct.place(breaker, startNode, "after");
						if(endNode){
							domConstruct.place(endNode, breaker, "after");
						}
						domConstruct.destroy(rs);
						var newrange = rangeapi.create(this.window);
						newrange.setStart(sNode, 0);
						newrange.setEnd(sNode, sNode.length);
						selection.removeAllRanges();
						selection.addRange(newrange);
						doc.execCommand(command);
						domConstruct.place(breaker.firstChild, breaker, "before");
						domConstruct.destroy(breaker);
						newrange.setStart(sNode, 0);
						newrange.setEnd(sNode, sNode.length);
						selection.removeAllRanges();
						selection.addRange(newrange);
						this.selection.collapse(false);
						sNode.parentNode.innerHTML = "";
						return true;
					}
				}
			}else{
				return false;
			}
		},

		_adaptIEList: function(command /*===== , argument =====*/){
			// summary:
			//		This function handles normalizing the IE list behavior as
			//		much as possible.
			// command:
			//		The list command to execute.
			// argument:
			//		Any additional argument.
			// tags:
			//		private
			var selection = rangeapi.getSelection(this.window);
			if(selection.isCollapsed){
				// In the case of no selection, lets commonize the behavior and
				// make sure that it indents if needed.
				if(selection.rangeCount && !this.queryCommandValue(command)){
					var range = selection.getRangeAt(0);
					var sc = range.startContainer;
					if(sc && sc.nodeType == 3){
						// text node.  Lets see if there is a node before it that isn't
						// some sort of breaker.
						if(!range.startOffset){
							// We're at the beginning of a text area.  It may have been br split
							// Who knows?  In any event, we must create the list manually
							// or IE may shove too much into the list element.  It seems to
							// grab content before the text node too if it's br split.
							// Why can't IE work like everyone else?

							// Create a space, we'll select and bold it, so
							// the whole word doesn't get bolded
							var lType = "ul";
							if(command === "insertorderedlist"){
								lType = "ol";
							}
							var list = this.document.createElement(lType);
							var li = domConstruct.create("li", null, list);
							domConstruct.place(list, sc, "before");
							// Move in the text node as part of the li.
							li.appendChild(sc);
							// We need a br after it or the enter key handler
							// sometimes throws errors.
							domConstruct.create("br", null, list, "after");
							// Okay, now lets move our cursor to the beginning.
							var newrange = rangeapi.create(this.window);
							newrange.setStart(sc, 0);
							newrange.setEnd(sc, sc.length);
							selection.removeAllRanges();
							selection.addRange(newrange);
							this.selection.collapse(true);
							return true;
						}
					}
				}
			}
			return false;
		},

		_handleTextColorOrProperties: function(command, argument){
			// summary:
			//		This function handles applying text color as best it is
			//		able to do so when the selection is collapsed, making the
			//		behavior cross-browser consistent. It also handles the name
			//		and size for IE.
			// command:
			//		The command.
			// argument:
			//		Any additional arguments.
			// tags:
			//		private
			var selection = rangeapi.getSelection(this.window);
			var doc = this.document;
			var rs, ret, range, txt, startNode, endNode, breaker, sNode;
			argument = argument || null;
			if(command && selection && selection.isCollapsed){
				if(selection.rangeCount){
					range = selection.getRangeAt(0);
					rs = range.startContainer;
					if(rs && rs.nodeType === 3){
						// Text node, we have to split it.
						var offset = range.startOffset;
						if(rs.length < offset){
							//We are not splitting the right node, try to locate the correct one
							ret = this._adjustNodeAndOffset(rs, offset);
							rs = ret.node;
							offset = ret.offset;
						}
						txt = rs.nodeValue;
						startNode = doc.createTextNode(txt.substring(0, offset));
						var endText = txt.substring(offset);
						if(endText !== ""){
							endNode = doc.createTextNode(txt.substring(offset));
						}
						// Create a space, we'll select and bold it, so
						// the whole word doesn't get bolded
						breaker = doc.createElement("span");
						sNode = doc.createTextNode(".");
						breaker.appendChild(sNode);
						// Create a junk node to avoid it trying to style the breaker.
						// This will get destroyed later.
						var extraSpan = doc.createElement("span");
						breaker.appendChild(extraSpan);
						if(startNode.length){
							domConstruct.place(startNode, rs, "after");
						}else{
							startNode = rs;
						}
						domConstruct.place(breaker, startNode, "after");
						if(endNode){
							domConstruct.place(endNode, breaker, "after");
						}
						domConstruct.destroy(rs);
						var newrange = rangeapi.create(this.window);
						newrange.setStart(sNode, 0);
						newrange.setEnd(sNode, sNode.length);
						selection.removeAllRanges();
						selection.addRange(newrange);
						if(has("webkit")){
							// WebKit is frustrating with positioning the cursor.
							// It stinks to have a selected space, but there really
							// isn't much choice here.
							var style = "color";
							if(command === "hilitecolor" || command === "backcolor"){
								style = "backgroundColor";
							}
							domStyle.set(breaker, style, argument);
							this.selection.remove();
							domConstruct.destroy(extraSpan);
							breaker.innerHTML = "&#160;";	// &nbsp;
							this.selection.selectElement(breaker);
							this.focus();
						}else{
							this.execCommand(command, argument);
							domConstruct.place(breaker.firstChild, breaker, "before");
							domConstruct.destroy(breaker);
							newrange.setStart(sNode, 0);
							newrange.setEnd(sNode, sNode.length);
							selection.removeAllRanges();
							selection.addRange(newrange);
							this.selection.collapse(false);
							sNode.parentNode.removeChild(sNode);
						}
						return true;
					}
				}
			}
			return false;
		},

		_adjustNodeAndOffset: function(/*DomNode*/node, /*Int*/offset){
			// summary:
			//		In the case there are multiple text nodes in a row the offset may not be within the node.
			//		If the offset is larger than the node length, it will attempt to find
			//		the next text sibling until it locates the text node in which the offset refers to
			// node:
			//		The node to check.
			// offset:
			//		The position to find within the text node
			// tags:
			//		private.
			while(node.length < offset && node.nextSibling && node.nextSibling.nodeType === 3){
				//Adjust the offset and node in the case of multiple text nodes in a row
				offset = offset - node.length;
				node = node.nextSibling;
			}
			return {"node": node, "offset": offset};
		},

		_tagNamesForCommand: function(command){
			// summary:
			//		Function to return the tab names that are associated
			//		with a particular style.
			// command: String
			//		The command to return tags for.
			// tags:
			//		private
			if(command === "bold"){
				return ["b", "strong"];
			}else if(command === "italic"){
				return ["i", "em"];
			}else if(command === "strikethrough"){
				return ["s", "strike"];
			}else if(command === "superscript"){
				return ["sup"];
			}else if(command === "subscript"){
				return ["sub"];
			}else if(command === "underline"){
				return ["u"];
			}
			return [];
		},

		_stripBreakerNodes: function(/*DOMNode*/ node){
			// summary:
			//		Function for stripping out the breaker spans inserted by the formatting command.
			//		Registered as a filter for IE, handles the breaker spans needed to fix up
			//		How bold/italic/etc, work when selection is collapsed (single cursor).
			if(!this.isLoaded){
				return;
			} // this method requires init to be complete
			query(".ieFormatBreakerSpan", node).forEach(function(b){
				while(b.firstChild){
					domConstruct.place(b.firstChild, b, "before");
				}
				domConstruct.destroy(b);
			});
			return node;
		},

		_stripTrailingEmptyNodes: function(/*DOMNode*/ node){
			// summary:
			//		Function for stripping trailing nodes without any text, excluding trailing nodes
			//		like <img> or <div><img></div>, even though they don't have text either.

			function isEmpty(node){
				// If not for old IE we could check for Element children by node.firstElementChild
				return (/^(p|div|br)$/i.test(node.nodeName) && node.children.length == 0 &&
					/^[\s\xA0]*$/.test(node.textContent || node.innerText || "")) ||
					(node.nodeType === 3/*text*/ && /^[\s\xA0]*$/.test(node.nodeValue));
			}
			while(node.lastChild && isEmpty(node.lastChild)){
				domConstruct.destroy(node.lastChild);
			}

			return node;
		},

		// Needed to support ToggleDir plugin.  Intentionally not inside if(has("dojo-bidi")) block
		// so that (for backwards compatibility) ToggleDir plugin works even when has("dojo-bidi") is falsy.
		_setTextDirAttr: function(/*String*/ value){
			// summary:
			//		Sets textDir attribute.  Sets direction of editNode accordingly.
			this._set("textDir", value);
			this.onLoadDeferred.then(lang.hitch(this, function(){
				this.editNode.dir = value;
			}));
		}
	});

	return RichText;
});
