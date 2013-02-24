define([
	"dojo/_base/array", // array.indexOf array.map
	"dojo/_base/declare", // declare
	"dojo/dom-construct", // domConstruct.place
	"dojo/i18n", // i18n.getLocalization
	"dojo/_base/lang", // lang.delegate lang.hitch lang.isString
	"dojo/store/Memory", // MemoryStore
	"../../registry", // registry.getUniqueId
	"../../_Widget",
	"../../_TemplatedMixin",
	"../../_WidgetsInTemplateMixin",
	"../../form/FilteringSelect",
	"../_Plugin",
	"../range",
	"dojo/i18n!../nls/FontChoice"
], function(array, declare, domConstruct, i18n, lang, MemoryStore,
	registry, _Widget, _TemplatedMixin, _WidgetsInTemplateMixin, FilteringSelect, _Plugin, rangeapi){


// module:
//		dijit/_editor/plugins/FontChoice


var _FontDropDown = declare("dijit._editor.plugins._FontDropDown",
	[_Widget, _TemplatedMixin, _WidgetsInTemplateMixin], {
	// summary:
	//		Base class for widgets that contains a label (like "Font:")
	//		and a FilteringSelect drop down to pick a value.
	//		Used as Toolbar entry.

	// label: [public] String
	//		The label to apply to this particular FontDropDown.
	label: "",

	// plainText: [public] boolean
	//		Flag to indicate that the returned label should be plain text
	//		instead of an example.
	plainText: false,

	// templateString: [public] String
	//		The template used to construct the labeled dropdown.
	templateString:
		"<span style='white-space: nowrap' class='dijit dijitReset dijitInline'>" +
			"<label class='dijitLeft dijitInline' for='${selectId}'>${label}</label>" +
			"<input data-dojo-type='dijit.form.FilteringSelect' required='false' " +
			        "data-dojo-props='labelType:\"html\", labelAttr:\"label\", searchAttr:\"name\"' " +
					"tabIndex='-1' id='${selectId}' data-dojo-attach-point='select' value=''/>" +
		"</span>",

	postMixInProperties: function(){
		// summary:
		//		Over-ride to set specific properties.
		this.inherited(arguments);

		this.strings = i18n.getLocalization("dijit._editor", "FontChoice");

		// Set some substitution variables used in the template
		this.label = this.strings[this.command];

		// _WidgetBase sets the id after postMixInProperties(), but we need it now.
		// Alternative is to have a buildRendering() method and move this.selectId setting there,
		// or alternately get rid of selectId variable and just access ${id} in template?
		this.id = registry.getUniqueId(this.declaredClass.replace(/\./g,"_"));

		this.selectId = this.id + "_select";	// used in template

		this.inherited(arguments);
	},

	postCreate: function(){
		// summary:
		//		Over-ride for the default postCreate action
		//		This establishes the filtering selects and the like.

		// Initialize the list of items in the drop down by creating data store with items like:
		// {value: 1, name: "xx-small", label: "<font size=1>xx-small</font-size>" }
		this.select.set("store", new MemoryStore({
			idProperty: "value",
			data: array.map(this.values, function(value){
				var name = this.strings[value] || value;
				return {
					label: this.getLabel(value, name),
					name: name,
					value: value
				};
			}, this)
		}));

		this.select.set("value", "", false);
		this.disabled = this.select.get("disabled");
	},

	_setValueAttr: function(value, priorityChange){
		// summary:
		//		Over-ride for the default action of setting the
		//		widget value, maps the input to known values
		// value: Object|String
		//		The value to set in the select.
		// priorityChange:
		//		Optional parameter used to tell the select whether or not to fire
		//		onChange event.

		// if the value is not a permitted value, just set empty string to prevent showing the warning icon
		priorityChange = priorityChange !== false;
		this.select.set('value', array.indexOf(this.values,value) < 0 ? "" : value, priorityChange);
		if(!priorityChange){
			// Clear the last state in case of updateState calls.  Ref: #10466
			this.select._lastValueReported=null;
		}
	},

	_getValueAttr: function(){
		// summary:
		//		Allow retrieving the value from the composite select on
		//		call to button.get("value");
		return this.select.get('value');
	},

	focus: function(){
		// summary:
		//		Over-ride for focus control of this widget.  Delegates focus down to the
		//		filtering select.
		this.select.focus();
	},

	_setDisabledAttr: function(value){
		// summary:
		//		Over-ride for the button's 'disabled' attribute so that it can be
		//		disabled programmatically.

		// Save off ths disabled state so the get retrieves it correctly
		//without needing to have a function proxy it.
		this.disabled = value;
		this.select.set("disabled", value);
	}
});


var _FontNameDropDown = declare("dijit._editor.plugins._FontNameDropDown", _FontDropDown, {
	// summary:
	//		Dropdown to select a font; goes in editor toolbar.

	// generic: [const] Boolean
	//		Use generic (web standard) font names
	generic: false,

	// command: [public] String
	//		The editor 'command' implemented by this plugin.
	command: "fontName",

	postMixInProperties: function(){
		// summary:
		//		Over-ride for the default posr mixin control
		if(!this.values){
			this.values = this.generic ?
				["serif", "sans-serif", "monospace", "cursive", "fantasy"] : // CSS font-family generics
					["Arial", "Times New Roman", "Comic Sans MS", "Courier New"];
		}
		this.inherited(arguments);
	},

	getLabel: function(value, name){
		// summary:
		//		Function used to generate the labels of the format dropdown
		//		will return a formatted, or plain label based on the value
		//		of the plainText option.
		// value: String
		//		The 'insert value' associated with a name
		// name: String
		//		The text name of the value
		if(this.plainText){
			return name;
		}else{
			return "<div style='font-family: "+value+"'>" + name + "</div>";
		}
	},

	_setValueAttr: function(value, priorityChange){
		// summary:
		//		Over-ride for the default action of setting the
		//		widget value, maps the input to known values

		priorityChange = priorityChange !== false;
		if(this.generic){
			var map = {
				"Arial": "sans-serif",
				"Helvetica": "sans-serif",
				"Myriad": "sans-serif",
				"Times": "serif",
				"Times New Roman": "serif",
				"Comic Sans MS": "cursive",
				"Apple Chancery": "cursive",
				"Courier": "monospace",
				"Courier New": "monospace",
				"Papyrus": "fantasy",
				"Estrangelo Edessa": "cursive", // Windows 7
				"Gabriola": "fantasy" // Windows 7
			};
			value = map[value] || value;
		}
		this.inherited(arguments, [value, priorityChange]);
	}
});

var _FontSizeDropDown = declare("dijit._editor.plugins._FontSizeDropDown", _FontDropDown, {
	// summary:
	//		Dropdown to select a font size; goes in editor toolbar.

	// command: [public] String
	//		The editor 'command' implemented by this plugin.
	command: "fontSize",

	// values: [public] Number[]
	//		The HTML font size values supported by this plugin
	values: [1,2,3,4,5,6,7], // sizes according to the old HTML FONT SIZE

	getLabel: function(value, name){
		// summary:
		//		Function used to generate the labels of the format dropdown
		//		will return a formatted, or plain label based on the value
		//		of the plainText option.
		//		We're stuck using the deprecated FONT tag to correspond
		//		with the size measurements used by the editor
		// value: String
		//		The 'insert value' associated with a name
		// name: String
		//		The text name of the value
		if(this.plainText){
			return name;
		}else{
			return "<font size=" + value + "'>" + name + "</font>";
		}
	},

	_setValueAttr: function(value, priorityChange){
		// summary:
		//		Over-ride for the default action of setting the
		//		widget value, maps the input to known values
		priorityChange = priorityChange !== false;
		if(value.indexOf && value.indexOf("px") != -1){
			var pixels = parseInt(value, 10);
			value = {10:1, 13:2, 16:3, 18:4, 24:5, 32:6, 48:7}[pixels] || value;
		}

		this.inherited(arguments, [value, priorityChange]);
	}
});


var _FormatBlockDropDown = declare("dijit._editor.plugins._FormatBlockDropDown", _FontDropDown, {
	// summary:
	//		Dropdown to select a format (like paragraph or heading); goes in editor toolbar.

	// command: [public] String
	//		The editor 'command' implemented by this plugin.
	command: "formatBlock",

	// values: [public] Array
	//		The HTML format tags supported by this plugin
	values: ["noFormat", "p", "h1", "h2", "h3", "pre"],

	postCreate: function(){
		// Init and set the default value to no formatting.  Update state will adjust it
		// as needed.
		this.inherited(arguments);
		this.set("value", "noFormat", false);
	},

	getLabel: function(value, name){
		// summary:
		//		Function used to generate the labels of the format dropdown
		//		will return a formatted, or plain label based on the value
		//		of the plainText option.
		// value: String
		//		The 'insert value' associated with a name
		// name: String
		//		The text name of the value
		if(this.plainText || value == "noFormat"){
			return name;
		}else{
			return "<" + value + ">" + name + "</" + value + ">";
		}
	},

	_execCommand: function(editor, command, choice){
		// summary:
		//		Over-ride for default exec-command label.
		//		Allows us to treat 'none' as special.
		if(choice === "noFormat"){
			var start;
			var end;
			var sel = rangeapi.getSelection(editor.window);
			if(sel && sel.rangeCount > 0){
				var range = sel.getRangeAt(0);
				var node, tag;
				if(range){
					start = range.startContainer;
					end = range.endContainer;

					// find containing nodes of start/end.
					while(start && start !== editor.editNode &&
						  start !== editor.document.body &&
						  start.nodeType !== 1){
						start = start.parentNode;
					}

					while(end && end !== editor.editNode &&
						  end !== editor.document.body &&
						  end.nodeType !== 1){
						end = end.parentNode;
					}

					var processChildren = lang.hitch(this, function(node, ary){
						if(node.childNodes && node.childNodes.length){
							var i;
							for(i = 0; i < node.childNodes.length; i++){
								var c = node.childNodes[i];
								if(c.nodeType == 1){
									if(editor._sCall("inSelection", [c])){
										var tag = c.tagName? c.tagName.toLowerCase(): "";
										if(array.indexOf(this.values, tag) !== -1){
											ary.push(c);
										}
										processChildren(c, ary);
									}
								}
							}
						}
					});

					var unformatNodes = lang.hitch(this, function(nodes){
						// summary:
						//		Internal function to clear format nodes.
						// nodes:
						//		The array of nodes to strip formatting from.
						if(nodes && nodes.length){
							editor.beginEditing();
							while(nodes.length){
								this._removeFormat(editor, nodes.pop());
							}
							editor.endEditing();
						}
					});

					var clearNodes = [];
					if(start == end){
						//Contained within the same block, may be collapsed, but who cares, see if we
						// have a block element to remove.
						var block;
						node = start;
						while(node && node !== editor.editNode && node !== editor.document.body){
							if(node.nodeType == 1){
								tag = node.tagName? node.tagName.toLowerCase(): "";
								if(array.indexOf(this.values, tag) !== -1){
									block = node;
									break;
								}
							}
							node = node.parentNode;
						}

						//Also look for all child nodes in the selection that may need to be
						//cleared of formatting
						processChildren(start, clearNodes);
						if(block){ clearNodes = [block].concat(clearNodes); }
						unformatNodes(clearNodes);
					}else{
						// Probably a multi select, so we have to process it.  Whee.
						node = start;
						while(editor._sCall("inSelection", [node])){
							if(node.nodeType == 1){
								tag = node.tagName? node.tagName.toLowerCase(): "";
								if(array.indexOf(this.values, tag) !== -1){
									clearNodes.push(node);
								}
								processChildren(node,clearNodes);
							}
							node = node.nextSibling;
						}
						unformatNodes(clearNodes);
					}
					editor.onDisplayChanged();
				}
			}
		}else{
			editor.execCommand(command, choice);
		}
	},

	_removeFormat: function(editor, node){
		// summary:
		//		function to remove the block format node.
		// node:
		//		The block format node to remove (and leave the contents behind)
		if(editor.customUndo){
			// So of course IE doesn't work right with paste-overs.
			// We have to do this manually, which is okay since IE already uses
			// customUndo and we turned it on for WebKit.  WebKit pasted funny,
			// so couldn't use the execCommand approach
			while(node.firstChild){
				domConstruct.place(node.firstChild, node, "before");
			}
			node.parentNode.removeChild(node);
		}else{
			// Everyone else works fine this way, a paste-over and is native
			// undo friendly.
			editor._sCall("selectElementChildren", [node])
			var html = editor._sCall("getSelectedHtml", [])
			editor._sCall("selectElement", [node])
			editor.execCommand("inserthtml", html||"");
		}
	}
});

// TODO: for 2.0, split into FontChoice plugin into three separate classes,
// one for each command (and change registry below)
var FontChoice = declare("dijit._editor.plugins.FontChoice", _Plugin,{
	// summary:
	//		This plugin provides three drop downs for setting style in the editor
	//		(font, font size, and format block), as controlled by command.
	//
	// description:
	//		The commands provided by this plugin are:
	//
	//		- fontName: Provides a drop down to select from a list of font names
	//		- fontSize: Provides a drop down to select from a list of font sizes
	//		- formatBlock: Provides a drop down to select from a list of block styles
	//		  which can easily be added to an editor by including one or more of the above commands
	//		  in the `plugins` attribute as follows:
	//
	//	|	plugins="['fontName','fontSize',...]"
	//
	//		It is possible to override the default dropdown list by providing an Array for the `custom` property when
	//		instantiating this plugin, e.g.
	//
	//	|	plugins="[{name:'dijit._editor.plugins.FontChoice', command:'fontName', values:['Verdana','Myriad','Garamond']},...]"
	//
	//		Alternatively, for `fontName` only, `generic:true` may be specified to provide a dropdown with
	//		[CSS generic font families](http://www.w3.org/TR/REC-CSS2/fonts.html#generic-font-families).
	//
	//		Note that the editor is often unable to properly handle font styling information defined outside
	//		the context of the current editor instance, such as pre-populated HTML.

	// useDefaultCommand: [protected] Boolean
	//		Override _Plugin.useDefaultCommand...
	//		processing is handled by this plugin, not by dijit/Editor.
	useDefaultCommand: false,

	_initButton: function(){
		// summary:
		//		Overrides _Plugin._initButton(), to initialize the FilteringSelect+label in toolbar,
		//		rather than a simple button.
		// tags:
		//		protected

		// Create the widget to go into the toolbar (the so-called "button")
		var clazz = {
				fontName: _FontNameDropDown,
				fontSize: _FontSizeDropDown,
				formatBlock: _FormatBlockDropDown
			}[this.command],
		params = this.params;

		// For back-compat reasons support setting custom values via "custom" parameter
		// rather than "values" parameter.   Remove in 2.0.
		if(this.params.custom){
			params.values = this.params.custom;
		}

		var editor = this.editor;
		this.button = new clazz(lang.delegate({dir: editor.dir, lang: editor.lang}, params));

		// Reflect changes to the drop down in the editor
		this.connect(this.button.select, "onChange", function(choice){
			// User invoked change, since all internal updates set priorityChange to false and will
			// not trigger an onChange event.
			this.editor.focus();

			if(this.command == "fontName" && choice.indexOf(" ") != -1){ choice = "'" + choice + "'"; }

			// Invoke, the editor already normalizes commands called through its
			// execCommand.
			if(this.button._execCommand){
				this.button._execCommand(this.editor, this.command, choice);
			}else{
				this.editor.execCommand(this.command, choice);
			}
		});
	},

	updateState: function(){
		// summary:
		//		Overrides _Plugin.updateState().  This controls updating the menu
		//		options to the right values on state changes in the document (that trigger a
		//		test of the actions.)
		//		It set value of drop down in toolbar to reflect font/font size/format block
		//		of text at current caret position.
		// tags:
		//		protected
		var _e = this.editor;
		var _c = this.command;
		if(!_e || !_e.isLoaded || !_c.length){ return; }

		if(this.button){
			var disabled = this.get("disabled");
			this.button.set("disabled", disabled);
			if(disabled){ return; }
			var value;
			try{
				value = _e.queryCommandValue(_c) || "";
			}catch(e){
				//Firefox may throw error above if the editor is just loaded, ignore it
				value = "";
			}

			// strip off single quotes, if any
			var quoted = lang.isString(value) && value.match(/'([^']*)'/);
			if(quoted){ value = quoted[1]; }

			if(_c === "formatBlock"){
				if(!value || value == "p"){
					// Some browsers (WebKit) doesn't actually get the tag info right.
					// and IE returns paragraph when in a DIV!, so incorrect a lot,
					// so we have double-check it.
					value = null;
					var elem;
					// Try to find the current element where the caret is.
					var sel = rangeapi.getSelection(this.editor.window);
					if(sel && sel.rangeCount > 0){
						var range = sel.getRangeAt(0);
						if(range){
							elem = range.endContainer;
						}
					}

					// Okay, now see if we can find one of the formatting types we're in.
					while(elem && elem !== _e.editNode && elem !== _e.document){
						var tg = elem.tagName?elem.tagName.toLowerCase():"";
						if(tg && array.indexOf(this.button.values, tg) > -1){
							value = tg;
							break;
						}
						elem = elem.parentNode;
					}
					if(!value){
						// Still no value, so lets select 'none'.
						value = "noFormat";
					}
				}else{
					// Check that the block format is one allowed, if not,
					// null it so that it gets set to empty.
					if(array.indexOf(this.button.values, value) < 0){
						value = "noFormat";
					}
				}
			}
			if(value !== this.button.get("value")){
				// Set the value, but denote it is not a priority change, so no
				// onchange fires.
				this.button.set('value', value, false);
			}
		}
	}
});

// Register these plugins
array.forEach(["fontName", "fontSize", "formatBlock"], function(name){
	_Plugin.registry[name] = function(args){
		return new FontChoice({
			command: name,
			plainText: args.plainText
		});
	};
});

// Make all classes available through AMD, and return main class
FontChoice._FontDropDown = _FontDropDown;
FontChoice._FontNameDropDown = _FontNameDropDown;
FontChoice._FontSizeDropDown = _FontSizeDropDown;
FontChoice._FormatBlockDropDown = _FormatBlockDropDown;
return FontChoice;

});
