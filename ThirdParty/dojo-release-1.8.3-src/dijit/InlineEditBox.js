define([
	"require",
	"dojo/_base/array", // array.forEach
	"dojo/_base/declare", // declare
	"dojo/dom-attr", // domAttr.set domAttr.get
	"dojo/dom-class", // domClass.add domClass.remove domClass.toggle
	"dojo/dom-construct", // domConstruct.create domConstruct.destroy
	"dojo/dom-style", // domStyle.getComputedStyle domStyle.set domStyle.get
	"dojo/_base/event", // event.stop
	"dojo/i18n", // i18n.getLocalization
	"dojo/_base/kernel", // kernel.deprecated
	"dojo/keys", // keys.ENTER keys.ESCAPE
	"dojo/_base/lang", // lang.getObject
	"dojo/sniff", // has("ie")
	"dojo/when",
	"./focus",
	"./_Widget",
	"./_TemplatedMixin",
	"./_WidgetsInTemplateMixin",
	"./_Container",
	"./form/Button",
	"./form/_TextBoxMixin",
	"./form/TextBox",
	"dojo/text!./templates/InlineEditBox.html",
	"dojo/i18n!./nls/common"
], function(require, array, declare, domAttr, domClass, domConstruct, domStyle, event, i18n, kernel, keys, lang, has, when,
			fm, _Widget, _TemplatedMixin, _WidgetsInTemplateMixin, _Container, Button, _TextBoxMixin, TextBox, template){

	// module:
	//		dijit/InlineEditBox

	var InlineEditor = declare("dijit._InlineEditor", [_Widget, _TemplatedMixin, _WidgetsInTemplateMixin], {
		// summary:
		//		Internal widget used by InlineEditBox, displayed when in editing mode
		//		to display the editor and maybe save/cancel buttons.  Calling code should
		//		connect to save/cancel methods to detect when editing is finished
		//
		//		Has mainly the same parameters as InlineEditBox, plus these values:
		//
		// style: Object
		//		Set of CSS attributes of display node, to replicate in editor
		//
		// value: String
		//		Value as an HTML string or plain text string, depending on renderAsHTML flag

		templateString: template,

		postMixInProperties: function(){
			this.inherited(arguments);
			this.messages = i18n.getLocalization("dijit", "common", this.lang);
			array.forEach(["buttonSave", "buttonCancel"], function(prop){
				if(!this[prop]){
					this[prop] = this.messages[prop];
				}
			}, this);
		},

		buildRendering: function(){
			this.inherited(arguments);

			// Create edit widget in place in the template
			// TODO: remove getObject() for 2.0
			var Cls = typeof this.editor == "string" ? (lang.getObject(this.editor) || require(this.editor)) : this.editor;

			// Copy the style from the source
			// Don't copy ALL properties though, just the necessary/applicable ones.
			// wrapperStyle/destStyle code is to workaround IE bug where getComputedStyle().fontSize
			// is a relative value like 200%, rather than an absolute value like 24px, and
			// the 200% can refer *either* to a setting on the node or it's ancestor (see #11175)
			var srcStyle = this.sourceStyle,
				editStyle = "line-height:" + srcStyle.lineHeight + ";",
				destStyle = domStyle.getComputedStyle(this.domNode);
			array.forEach(["Weight", "Family", "Size", "Style"], function(prop){
				var textStyle = srcStyle["font" + prop],
					wrapperStyle = destStyle["font" + prop];
				if(wrapperStyle != textStyle){
					editStyle += "font-" + prop + ":" + srcStyle["font" + prop] + ";";
				}
			}, this);
			array.forEach(["marginTop", "marginBottom", "marginLeft", "marginRight", "position", "left", "top", "right", "bottom", "float", "clear", "display"], function(prop){
				this.domNode.style[prop] = srcStyle[prop];
			}, this);
			var width = this.inlineEditBox.width;
			if(width == "100%"){
				// block mode
				editStyle += "width:100%;";
				this.domNode.style.display = "block";
			}else{
				// inline-block mode
				editStyle += "width:" + (width + (Number(width) == width ? "px" : "")) + ";";
			}
			var editorParams = lang.delegate(this.inlineEditBox.editorParams, {
				style: editStyle,
				dir: this.dir,
				lang: this.lang,
				textDir: this.textDir
			});
			editorParams[ "displayedValue" in Cls.prototype ? "displayedValue" : "value"] = this.value;
			this.editWidget = new Cls(editorParams, this.editorPlaceholder);

			if(this.inlineEditBox.autoSave){
				// Remove the save/cancel buttons since saving is done by simply tabbing away or
				// selecting a value from the drop down list
				domConstruct.destroy(this.buttonContainer);
			}
		},

		postCreate: function(){
			this.inherited(arguments);

			var ew = this.editWidget;

			if(this.inlineEditBox.autoSave){
				// Selecting a value from a drop down list causes an onChange event and then we save
				this.connect(ew, "onChange", "_onChange");

				// ESC and TAB should cancel and save.  Note that edit widgets do a stopEvent() on ESC key (to
				// prevent Dialog from closing when the user just wants to revert the value in the edit widget),
				// so this is the only way we can see the key press event.
				this.connect(ew, "onKeyPress", "_onKeyPress");
			}else{
				// If possible, enable/disable save button based on whether the user has changed the value
				if("intermediateChanges" in ew){
					ew.set("intermediateChanges", true);
					this.connect(ew, "onChange", "_onIntermediateChange");
					this.saveButton.set("disabled", true);
				}
			}
		},

		startup: function(){
			this.editWidget.startup();
			this.inherited(arguments);
		},

		_onIntermediateChange: function(/*===== val =====*/){
			// summary:
			//		Called for editor widgets that support the intermediateChanges=true flag as a way
			//		to detect when to enable/disabled the save button
			this.saveButton.set("disabled", (this.getValue() == this._resetValue) || !this.enableSave());
		},

		destroy: function(){
			this.editWidget.destroy(true); // let the parent wrapper widget clean up the DOM
			this.inherited(arguments);
		},

		getValue: function(){
			// summary:
			//		Return the [display] value of the edit widget
			var ew = this.editWidget;
			return String(ew.get("displayedValue" in ew ? "displayedValue" : "value"));
		},

		_onKeyPress: function(e){
			// summary:
			//		Handler for keypress in the edit box in autoSave mode.
			// description:
			//		For autoSave widgets, if Esc/Enter, call cancel/save.
			// tags:
			//		private

			if(this.inlineEditBox.autoSave && this.inlineEditBox.editing){
				if(e.altKey || e.ctrlKey){
					return;
				}
				// If Enter/Esc pressed, treat as save/cancel.
				if(e.charOrCode == keys.ESCAPE){
					event.stop(e);
					this.cancel(true); // sets editing=false which short-circuits _onBlur processing
				}else if(e.charOrCode == keys.ENTER && e.target.tagName == "INPUT"){
					event.stop(e);
					this._onChange(); // fire _onBlur and then save
				}

				// _onBlur will handle TAB automatically by allowing
				// the TAB to change focus before we mess with the DOM: #6227
				// Expounding by request:
				//	The current focus is on the edit widget input field.
				//	save() will hide and destroy this widget.
				//	We want the focus to jump from the currently hidden
				//	displayNode, but since it's hidden, it's impossible to
				//	unhide it, focus it, and then have the browser focus
				//	away from it to the next focusable element since each
				//	of these events is asynchronous and the focus-to-next-element
				//	is already queued.
				//	So we allow the browser time to unqueue the move-focus event
				//	before we do all the hide/show stuff.
			}
		},

		_onBlur: function(){
			// summary:
			//		Called when focus moves outside the editor
			// tags:
			//		private

			this.inherited(arguments);
			if(this.inlineEditBox.autoSave && this.inlineEditBox.editing){
				if(this.getValue() == this._resetValue){
					this.cancel(false);
				}else if(this.enableSave()){
					this.save(false);
				}
			}
		},

		_onChange: function(){
			// summary:
			//		Called when the underlying widget fires an onChange event,
			//		such as when the user selects a value from the drop down list of a ComboBox,
			//		which means that the user has finished entering the value and we should save.
			// tags:
			//		private

			if(this.inlineEditBox.autoSave && this.inlineEditBox.editing && this.enableSave()){
				fm.focus(this.inlineEditBox.displayNode); // fires _onBlur which will save the formatted value
			}
		},

		enableSave: function(){
			// summary:
			//		User overridable function returning a Boolean to indicate
			//		if the Save button should be enabled or not - usually due to invalid conditions
			// tags:
			//		extension
			return this.editWidget.isValid ? this.editWidget.isValid() : true;
		},

		focus: function(){
			// summary:
			//		Focus the edit widget.
			// tags:
			//		protected

			this.editWidget.focus();

			if(this.editWidget.focusNode){
				// IE can take 30ms to report the focus event, but focus manager needs to know before a 0ms timeout.
				fm._onFocusNode(this.editWidget.focusNode);

				if(this.editWidget.focusNode.tagName == "INPUT"){
					this.defer(function(){
						_TextBoxMixin.selectInputText(this.editWidget.focusNode);
					});
				}
			}
		}
	});


	var InlineEditBox = declare("dijit.InlineEditBox", _Widget, {
		// summary:
		//		An element with in-line edit capabilities
		//
		// description:
		//		Behavior for an existing node (`<p>`, `<div>`, `<span>`, etc.) so that
		//		when you click it, an editor shows up in place of the original
		//		text.  Optionally, Save and Cancel button are displayed below the edit widget.
		//		When Save is clicked, the text is pulled from the edit
		//		widget and redisplayed and the edit widget is again hidden.
		//		By default a plain Textarea widget is used as the editor (or for
		//		inline values a TextBox), but you can specify an editor such as
		//		dijit.Editor (for editing HTML) or a Slider (for adjusting a number).
		//		An edit widget must support the following API to be used:
		//
		//		- displayedValue or value as initialization parameter,
		//			and available through set('displayedValue') / set('value')
		//		- void focus()
		//		- DOM-node focusNode = node containing editable text

		// editing: [readonly] Boolean
		//		Is the node currently in edit mode?
		editing: false,

		// autoSave: Boolean
		//		Changing the value automatically saves it; don't have to push save button
		//		(and save button isn't even displayed)
		autoSave: true,

		// buttonSave: String
		//		Save button label
		buttonSave: "",

		// buttonCancel: String
		//		Cancel button label
		buttonCancel: "",

		// renderAsHtml: Boolean
		//		Set this to true if the specified Editor's value should be interpreted as HTML
		//		rather than plain text (ex: `dijit.Editor`)
		renderAsHtml: false,

		// editor: String|Function
		//		MID (ex: "dijit/form/TextBox") or constructor for editor widget
		editor: TextBox,

		// editorWrapper: String|Function
		//		Class name (or reference to the Class) for widget that wraps the editor widget, displaying save/cancel
		//		buttons.
		editorWrapper: InlineEditor,

		// editorParams: Object
		//		Set of parameters for editor, like {required: true}
		editorParams: {},

		// disabled: Boolean
		//		If true, clicking the InlineEditBox to edit it will have no effect.
		disabled: false,

		onChange: function(/*===== value =====*/){
			// summary:
			//		Set this handler to be notified of changes to value.
			// tags:
			//		callback
		},

		onCancel: function(){
			// summary:
			//		Set this handler to be notified when editing is cancelled.
			// tags:
			//		callback
		},

		// width: String
		//		Width of editor.  By default it's width=100% (ie, block mode).
		width: "100%",

		// value: String
		//		The display value of the widget in read-only mode
		value: "",

		// noValueIndicator: [const] String
		//		The text that gets displayed when there is no value (so that the user has a place to click to edit)
		noValueIndicator: has("ie") <= 6 ? // font-family needed on IE6 but it messes up IE8
			"<span style='font-family: wingdings; text-decoration: underline;'>&#160;&#160;&#160;&#160;&#x270d;&#160;&#160;&#160;&#160;</span>" :
			"<span style='text-decoration: underline;'>&#160;&#160;&#160;&#160;&#x270d;&#160;&#160;&#160;&#160;</span>", // &#160; == &nbsp;

		constructor: function(/*===== params, srcNodeRef =====*/){
			// summary:
			//		Create the widget.
			// params: Object|null
			//		Hash of initialization parameters for widget, including scalar values (like title, duration etc.)
			//		and functions, typically callbacks like onClick.
			//		The hash can contain any of the widget's properties, excluding read-only properties.
			// srcNodeRef: DOMNode|String?
			//		If a srcNodeRef (DOM node) is specified:
			//
			//		- use srcNodeRef.innerHTML as my value
			//		- replace srcNodeRef with my generated DOM tree

			this.editorParams = {};
		},

		postMixInProperties: function(){
			this.inherited(arguments);

			// save pointer to original source node, since Widget nulls-out srcNodeRef
			this.displayNode = this.srcNodeRef;

			// connect handlers to the display node
			var events = {
				ondijitclick: "_onClick",
				onmouseover: "_onMouseOver",
				onmouseout: "_onMouseOut",
				onfocus: "_onMouseOver",
				onblur: "_onMouseOut"
			};
			for(var name in events){
				this.connect(this.displayNode, name, events[name]);
			}
			this.displayNode.setAttribute("role", "button");
			if(!this.displayNode.getAttribute("tabIndex")){
				this.displayNode.setAttribute("tabIndex", 0);
			}

			if(!this.value && !("value" in this.params)){ // "" is a good value if specified directly so check params){
				this.value = lang.trim(this.renderAsHtml ? this.displayNode.innerHTML :
					(this.displayNode.innerText || this.displayNode.textContent || ""));
			}
			if(!this.value){
				this.displayNode.innerHTML = this.noValueIndicator;
			}

			domClass.add(this.displayNode, 'dijitInlineEditBoxDisplayMode');
		},

		setDisabled: function(/*Boolean*/ disabled){
			// summary:
			//		Deprecated.   Use set('disabled', ...) instead.
			// tags:
			//		deprecated
			kernel.deprecated("dijit.InlineEditBox.setDisabled() is deprecated.  Use set('disabled', bool) instead.", "", "2.0");
			this.set('disabled', disabled);
		},

		_setDisabledAttr: function(/*Boolean*/ disabled){
			// summary:
			//		Hook to make set("disabled", ...) work.
			//		Set disabled state of widget.
			this.domNode.setAttribute("aria-disabled", disabled ? "true" : "false");
			if(disabled){
				this.displayNode.removeAttribute("tabIndex");
			}else{
				this.displayNode.setAttribute("tabIndex", 0);
			}
			domClass.toggle(this.displayNode, "dijitInlineEditBoxDisplayModeDisabled", disabled);
			this._set("disabled", disabled);
		},

		_onMouseOver: function(){
			// summary:
			//		Handler for onmouseover and onfocus event.
			// tags:
			//		private
			if(!this.disabled){
				domClass.add(this.displayNode, "dijitInlineEditBoxDisplayModeHover");
			}
		},

		_onMouseOut: function(){
			// summary:
			//		Handler for onmouseout and onblur event.
			// tags:
			//		private
			domClass.remove(this.displayNode, "dijitInlineEditBoxDisplayModeHover");
		},

		_onClick: function(/*Event*/ e){
			// summary:
			//		Handler for onclick event.
			// tags:
			//		private
			if(this.disabled){
				return;
			}
			if(e){
				event.stop(e);
			}
			this._onMouseOut();

			// Since FF gets upset if you move a node while in an event handler for that node...
			this.defer("edit");
		},

		edit: function(){
			// summary:
			//		Display the editor widget in place of the original (read only) markup.
			// tags:
			//		private

			if(this.disabled || this.editing){
				return;
			}
			this._set('editing', true);

			// save some display node values that can be restored later
			this._savedTabIndex = domAttr.get(this.displayNode, "tabIndex") || "0";

			if(this.wrapperWidget){
				var ew = this.wrapperWidget.editWidget;
				ew.set("displayedValue" in ew ? "displayedValue" : "value", this.value);
			}else{
				// Placeholder for edit widget
				// Put place holder (and eventually editWidget) before the display node so that it's positioned correctly
				// when Calendar dropdown appears, which happens automatically on focus.
				var placeholder = domConstruct.create("span", null, this.domNode, "before");

				// Create the editor wrapper (the thing that holds the editor widget and the save/cancel buttons)
				var Ewc = typeof this.editorWrapper == "string" ? lang.getObject(this.editorWrapper) : this.editorWrapper;
				this.wrapperWidget = new Ewc({
					value: this.value,
					buttonSave: this.buttonSave,
					buttonCancel: this.buttonCancel,
					dir: this.dir,
					lang: this.lang,
					tabIndex: this._savedTabIndex,
					editor: this.editor,
					inlineEditBox: this,
					sourceStyle: domStyle.getComputedStyle(this.displayNode),
					save: lang.hitch(this, "save"),
					cancel: lang.hitch(this, "cancel"),
					textDir: this.textDir
				}, placeholder);
				if(!this.wrapperWidget._started){
					this.wrapperWidget.startup();
				}
				if(!this._started){
					this.startup();
				}
			}
			var ww = this.wrapperWidget;

			// to avoid screen jitter, we first create the editor with position: absolute, visibility: hidden,
			// and then when it's finished rendering, we switch from display mode to editor
			// position: absolute releases screen space allocated to the display node
			// opacity:0 is the same as visibility: hidden but is still focusable
			// visibility: hidden removes focus outline

			domClass.add(this.displayNode, "dijitOffScreen");
			domClass.remove(ww.domNode, "dijitOffScreen");
			domStyle.set(ww.domNode, { visibility: "visible" });
			domAttr.set(this.displayNode, "tabIndex", "-1"); // needed by WebKit for TAB from editor to skip displayNode

			// After edit widget has finished initializing (in particular need to wait for dijit.Editor),
			// or immediately if there is no onLoadDeferred Deferred,
			// replace the display widget with edit widget, leaving them both displayed for a brief time so that
			// focus can be shifted without incident.
			when(ww.editWidget.onLoadDeferred, lang.hitch(ww, function(){
				this.defer(function(){ // defer needed so that the change of focus doesn't happen on mousedown which also sets focus
					this.focus(); // both nodes are showing, so we can switch focus safely
					this._resetValue = this.getValue();
				});
			}));
		},

		_onBlur: function(){
			// summary:
			//		Called when focus moves outside the InlineEditBox.
			//		Performs garbage collection.
			// tags:
			//		private

			this.inherited(arguments);
			if(!this.editing){
				/* causes IE focus problems, see TooltipDialog_a11y.html...
				 this.defer(function(){
				 if(this.wrapperWidget){
				 this.wrapperWidget.destroy();
				 delete this.wrapperWidget;
				 }
				 });
				 */
			}
		},

		destroy: function(){
			if(this.wrapperWidget && !this.wrapperWidget._destroyed){
				this.wrapperWidget.destroy();
				delete this.wrapperWidget;
			}
			this.inherited(arguments);
		},

		_showText: function(/*Boolean*/ focus){
			// summary:
			//		Revert to display mode, and optionally focus on display node
			// tags:
			//		private

			var ww = this.wrapperWidget;
			domStyle.set(ww.domNode, { visibility: "hidden" }); // hide the editor from mouse/keyboard events
			domClass.add(ww.domNode, "dijitOffScreen");
			domClass.remove(this.displayNode, "dijitOffScreen");
			domAttr.set(this.displayNode, "tabIndex", this._savedTabIndex);
			if(focus){
				fm.focus(this.displayNode);
			}
		},

		save: function(/*Boolean*/ focus){
			// summary:
			//		Save the contents of the editor and revert to display mode.
			// focus: Boolean
			//		Focus on the display mode text
			// tags:
			//		private

			if(this.disabled || !this.editing){
				return;
			}
			this._set('editing', false);

			var ww = this.wrapperWidget;
			var value = ww.getValue();
			this.set('value', value); // display changed, formatted value

			this._showText(focus); // set focus as needed
		},

		setValue: function(/*String*/ val){
			// summary:
			//		Deprecated.   Use set('value', ...) instead.
			// tags:
			//		deprecated
			kernel.deprecated("dijit.InlineEditBox.setValue() is deprecated.  Use set('value', ...) instead.", "", "2.0");
			return this.set("value", val);
		},

		_setValueAttr: function(/*String*/ val){
			// summary:
			//		Hook to make set("value", ...) work.
			//		Inserts specified HTML value into this node, or an "input needed" character if node is blank.

			val = lang.trim(val);
			var renderVal = this.renderAsHtml ? val : val.replace(/&/gm, "&amp;").replace(/</gm, "&lt;").replace(/>/gm, "&gt;").replace(/"/gm, "&quot;").replace(/\n/g, "<br>");
			this.displayNode.innerHTML = renderVal || this.noValueIndicator;
			this._set("value", val);

			if(this._started){
				// tell the world that we have changed
				this.defer(function(){
					this.onChange(val);
				}); // defer prevents browser freeze for long-running event handlers
			}
			// contextual (auto) text direction depends on the text value
			if(this.textDir == "auto"){
				this.applyTextDir(this.displayNode, this.displayNode.innerText);
			}
		},

		getValue: function(){
			// summary:
			//		Deprecated.   Use get('value') instead.
			// tags:
			//		deprecated
			kernel.deprecated("dijit.InlineEditBox.getValue() is deprecated.  Use get('value') instead.", "", "2.0");
			return this.get("value");
		},

		cancel: function(/*Boolean*/ focus){
			// summary:
			//		Revert to display mode, discarding any changes made in the editor
			// tags:
			//		private

			if(this.disabled || !this.editing){
				return;
			}
			this._set('editing', false);

			// tell the world that we have no changes
			this.defer("onCancel"); // defer prevents browser freeze for long-running event handlers

			this._showText(focus);
		},

		_setTextDirAttr: function(/*String*/ textDir){
			// summary:
			//		Setter for textDir.
			// description:
			//		Users shouldn't call this function; they should be calling
			//		set('textDir', value)
			// tags:
			//		private
			if(!this._created || this.textDir != textDir){
				this._set("textDir", textDir);
				this.applyTextDir(this.displayNode, this.displayNode.innerText);
				this.displayNode.align = this.dir == "rtl" ? "right" : "left"; //fix the text alignment
			}
		}
	});

	InlineEditBox._InlineEditor = InlineEditor;	// for monkey patching

	return InlineEditBox;
});