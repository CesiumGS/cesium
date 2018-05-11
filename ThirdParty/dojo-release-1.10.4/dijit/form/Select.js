define([
	"dojo/_base/array", // array.forEach
	"dojo/_base/declare", // declare
	"dojo/dom-attr", // domAttr.set
	"dojo/dom-class", // domClass.add domClass.remove domClass.toggle
	"dojo/dom-geometry", // domGeometry.setMarginBox
	"dojo/i18n", // i18n.getLocalization
	"dojo/keys",
	"dojo/_base/lang", // lang.hitch
	"dojo/on",
	"dojo/sniff", // has("ie")
	"./_FormSelectWidget",
	"../_HasDropDown",
	"../DropDownMenu",
	"../MenuItem",
	"../MenuSeparator",
	"../Tooltip",
	"../_KeyNavMixin",
	"../registry", // registry.byNode
	"dojo/text!./templates/Select.html",
	"dojo/i18n!./nls/validate"
], function(array, declare, domAttr, domClass, domGeometry, i18n, keys, lang, on, has,
			_FormSelectWidget, _HasDropDown, DropDownMenu, MenuItem, MenuSeparator, Tooltip, _KeyNavMixin, registry, template){

	// module:
	//		dijit/form/Select

	var _SelectMenu = declare("dijit.form._SelectMenu", DropDownMenu, {
		// summary:
		//		An internally-used menu for dropdown that allows us a vertical scrollbar

		// Override Menu.autoFocus setting so that opening a Select highlights the current value.
		autoFocus: true,

		buildRendering: function(){
			this.inherited(arguments);

			this.domNode.setAttribute("role", "listbox");
		},

		postCreate: function(){
			this.inherited(arguments);

			// stop mousemove from selecting text on IE to be consistent with other browsers
			this.own(on(this.domNode, "selectstart", function(evt){
				evt.preventDefault();
				evt.stopPropagation();
			}));
		},

		focus: function(){
			// summary:
			//		Overridden so that the previously selected value will be focused instead of only the first item
			var found = false,
				val = this.parentWidget.value;
			if(lang.isArray(val)){
				val = val[val.length - 1];
			}
			if(val){ // if focus selected
				array.forEach(this.parentWidget._getChildren(), function(child){
					if(child.option && (val === child.option.value)){ // find menu item widget with this value
						found = true;
						this.focusChild(child, false); // focus previous selection
					}
				}, this);
			}
			if(!found){
				this.inherited(arguments); // focus first item by default
			}
		}
	});

	var Select = declare("dijit.form.Select" + (has("dojo-bidi") ? "_NoBidi" : ""), [_FormSelectWidget, _HasDropDown, _KeyNavMixin], {
		// summary:
		//		This is a "styleable" select box - it is basically a DropDownButton which
		//		can take a `<select>` as its input.

		baseClass: "dijitSelect dijitValidationTextBox",

		templateString: template,

		_buttonInputDisabled: has("ie") ? "disabled" : "", // allows IE to disallow focus, but Firefox cannot be disabled for mousedown events

		// required: Boolean
		//		Can be true or false, default is false.
		required: false,

		// state: [readonly] String
		//		"Incomplete" if this select is required but unset (i.e. blank value), "" otherwise
		state: "",

		// message: String
		//		Currently displayed error/prompt message
		message: "",

		// tooltipPosition: String[]
		//		See description of `dijit/Tooltip.defaultPosition` for details on this parameter.
		tooltipPosition: [],

		// emptyLabel: string
		//		What to display in an "empty" dropdown
		emptyLabel: "&#160;", // &nbsp;

		// _isLoaded: Boolean
		//		Whether or not we have been loaded
		_isLoaded: false,

		// _childrenLoaded: Boolean
		//		Whether or not our children have been loaded
		_childrenLoaded: false,

		// labelType: String
		//		Specifies how to interpret the labelAttr in the data store items.
		//		Can be "html" or "text".
		labelType: "html",

		_fillContent: function(){
			// summary:
			//		Set the value to be the first, or the selected index
			this.inherited(arguments);
			// set value from selected option
			if(this.options.length && !this.value && this.srcNodeRef){
				var si = this.srcNodeRef.selectedIndex || 0; // || 0 needed for when srcNodeRef is not a SELECT
				this._set("value", this.options[si >= 0 ? si : 0].value);
			}
			// Create the dropDown widget
			this.dropDown = new _SelectMenu({ id: this.id + "_menu", parentWidget: this });
			domClass.add(this.dropDown.domNode, this.baseClass.replace(/\s+|$/g, "Menu "));
		},

		_getMenuItemForOption: function(/*_FormSelectWidget.__SelectOption*/ option){
			// summary:
			//		For the given option, return the menu item that should be
			//		used to display it.  This can be overridden as needed
			if(!option.value && !option.label){
				// We are a separator (no label set for it)
				return new MenuSeparator({ownerDocument: this.ownerDocument});
			}else{
				// Just a regular menu option
				var click = lang.hitch(this, "_setValueAttr", option);
				var item = new MenuItem({
					option: option,
					label: (this.labelType === 'text' ? (option.label || '').toString()
						.replace(/&/g, '&amp;').replace(/</g, '&lt;') :
						option.label) || this.emptyLabel,
					onClick: click,
					ownerDocument: this.ownerDocument,
					dir: this.dir,
					textDir: this.textDir,
					disabled: option.disabled || false
				});
				item.focusNode.setAttribute("role", "option");
				return item;
			}
		},

		_addOptionItem: function(/*_FormSelectWidget.__SelectOption*/ option){
			// summary:
			//		For the given option, add an option to our dropdown.
			//		If the option doesn't have a value, then a separator is added
			//		in that place.
			if(this.dropDown){
				this.dropDown.addChild(this._getMenuItemForOption(option));
			}
		},

		_getChildren: function(){
			if(!this.dropDown){
				return [];
			}
			return this.dropDown.getChildren();
		},

		focus: function(){
			// Override _KeyNavMixin::focus(), which calls focusFirstChild().
			// We just want the standard form widget behavior.
			if(!this.disabled && this.focusNode.focus){
				try{
					this.focusNode.focus();
				}catch(e){
					/*squelch errors from hidden nodes*/
				}
			}
		},

		focusChild: function(/*dijit/_WidgetBase*/ widget){
			// summary:
			//		Sets the value to the given option, used during search by letter.
			// widget:
			//		Reference to option's widget
			// tags:
			//		protected
			if(widget){
				this.set('value', widget.option);
			}
		},

		_getFirst: function(){
			// summary:
			//		Returns the first child widget.
			// tags:
			//		abstract extension
			var children = this._getChildren();
			return children.length ? children[0] : null;
		},

		_getLast: function(){
			// summary:
			//		Returns the last child widget.
			// tags:
			//		abstract extension
			var children = this._getChildren();
			return children.length ? children[children.length-1] : null;
		},

		childSelector: function(/*DOMNode*/ node){
			// Implement _KeyNavMixin.childSelector, to identify focusable child nodes.
			// If we allowed a dojo/query dependency from this module this could more simply be a string "> *"
			// instead of this function.

			var node = registry.byNode(node);
			return node && node.getParent() == this.dropDown;
		},

		onKeyboardSearch: function(/*dijit/_WidgetBase*/ item, /*Event*/ evt, /*String*/ searchString, /*Number*/ numMatches){
			// summary:
			//		When a key is pressed that matches a child item,
			//		this method is called so that a widget can take appropriate action is necessary.
			// tags:
			//		protected
			if(item){
				this.focusChild(item);
			}
		},

		_loadChildren: function(/*Boolean*/ loadMenuItems){
			// summary:
			//		Resets the menu and the length attribute of the button - and
			//		ensures that the label is appropriately set.
			// loadMenuItems: Boolean
			//		actually loads the child menu items - we only do this when we are
			//		populating for showing the dropdown.

			if(loadMenuItems === true){
				// this.inherited destroys this.dropDown's child widgets (MenuItems).
				// Avoid this.dropDown (Menu widget) having a pointer to a destroyed widget (which will cause
				// issues later in _setSelected). (see #10296)
				if(this.dropDown){
					delete this.dropDown.focusedChild;
					this.focusedChild = null;
				}
				if(this.options.length){
					this.inherited(arguments);
				}else{
					// Drop down menu is blank but add one blank entry just so something appears on the screen
					// to let users know that they are no choices (mimicing native select behavior)
					array.forEach(this._getChildren(), function(child){
						child.destroyRecursive();
					});
					var item = new MenuItem({
						ownerDocument: this.ownerDocument,
						label: this.emptyLabel
					});
					this.dropDown.addChild(item);
				}
			}else{
				this._updateSelection();
			}

			this._isLoaded = false;
			this._childrenLoaded = true;

			if(!this._loadingStore){
				// Don't call this if we are loading - since we will handle it later
				this._setValueAttr(this.value, false);
			}
		},

		_refreshState: function(){
			if(this._started){
				this.validate(this.focused);
			}
		},

		startup: function(){
			this.inherited(arguments);
			this._refreshState(); // after all _set* methods have run
		},

		_setValueAttr: function(value){
			this.inherited(arguments);
			domAttr.set(this.valueNode, "value", this.get("value"));
			this._refreshState();	// to update this.state
		},

		_setNameAttr: "valueNode",

		_setDisabledAttr: function(/*Boolean*/ value){
			this.inherited(arguments);
			this._refreshState();	// to update this.state
		},

		_setRequiredAttr: function(/*Boolean*/ value){
			this._set("required", value);
			this.focusNode.setAttribute("aria-required", value);
			this._refreshState();	// to update this.state
		},

		_setOptionsAttr: function(/*Array*/ options){
			this._isLoaded = false;
			this._set('options', options);
		},

		_setDisplay: function(/*String*/ newDisplay){
			// summary:
			//		sets the display for the given value (or values)

			var lbl = (this.labelType === 'text' ? (newDisplay || '')
					.replace(/&/g, '&amp;').replace(/</g, '&lt;') :
					newDisplay) || this.emptyLabel;
			this.containerNode.innerHTML = '<span role="option" class="dijitReset dijitInline ' + this.baseClass.replace(/\s+|$/g, "Label ") + '">' + lbl + '</span>';
		},

		validate: function(/*Boolean*/ isFocused){
			// summary:
			//		Called by oninit, onblur, and onkeypress, and whenever required/disabled state changes
			// description:
			//		Show missing or invalid messages if appropriate, and highlight textbox field.
			//		Used when a select is initially set to no value and the user is required to
			//		set the value.

			var isValid = this.disabled || this.isValid(isFocused);
			this._set("state", isValid ? "" : (this._hasBeenBlurred ? "Error" : "Incomplete"));
			this.focusNode.setAttribute("aria-invalid", isValid ? "false" : "true");
			var message = isValid ? "" : this._missingMsg;
			if(message && this.focused && this._hasBeenBlurred){
				Tooltip.show(message, this.domNode, this.tooltipPosition, !this.isLeftToRight());
			}else{
				Tooltip.hide(this.domNode);
			}
			this._set("message", message);
			return isValid;
		},

		isValid: function(/*Boolean*/ /*===== isFocused =====*/){
			// summary:
			//		Whether or not this is a valid value.  The only way a Select
			//		can be invalid is when it's required but nothing is selected.
			return (!this.required || this.value === 0 || !(/^\s*$/.test(this.value || ""))); // handle value is null or undefined
		},

		reset: function(){
			// summary:
			//		Overridden so that the state will be cleared.
			this.inherited(arguments);
			Tooltip.hide(this.domNode);
			this._refreshState();	// to update this.state
		},

		postMixInProperties: function(){
			// summary:
			//		set the missing message
			this.inherited(arguments);
			this._missingMsg = i18n.getLocalization("dijit.form", "validate", this.lang).missingMessage;
		},

		postCreate: function(){
			this.inherited(arguments);

			// stop mousemove from selecting text on IE to be consistent with other browsers
			this.own(on(this.domNode, "selectstart", function(evt){
				evt.preventDefault();
				evt.stopPropagation();
			}));

			this.domNode.setAttribute("aria-expanded", "false");

			// Prevent _KeyNavMixin from calling stopPropagation() on left and right arrow keys, thus breaking
			// navigation when Select inside Toolbar.
			var keyNavCodes = this._keyNavCodes;
			delete keyNavCodes[keys.LEFT_ARROW];
			delete keyNavCodes[keys.RIGHT_ARROW];
		},

		_setStyleAttr: function(/*String||Object*/ value){
			this.inherited(arguments);
			domClass.toggle(this.domNode, this.baseClass.replace(/\s+|$/g, "FixedWidth "), !!this.domNode.style.width);
		},

		isLoaded: function(){
			return this._isLoaded;
		},

		loadDropDown: function(/*Function*/ loadCallback){
			// summary:
			//		populates the menu
			this._loadChildren(true);
			this._isLoaded = true;
			loadCallback();
		},

		destroy: function(preserveDom){
			if(this.dropDown && !this.dropDown._destroyed){
				this.dropDown.destroyRecursive(preserveDom);
				delete this.dropDown;
			}
			Tooltip.hide(this.domNode);	// in case Select (or enclosing Dialog) destroyed while tooltip shown
			this.inherited(arguments);
		},

		_onFocus: function(){
			this.validate(true);	// show tooltip if second focus of required tooltip, but no selection
			// Note: not calling superclass _onFocus() to avoid _KeyNavMixin::_onFocus() setting tabIndex --> -1
		},

		_onBlur: function(){
			Tooltip.hide(this.domNode);
			this.inherited(arguments);
			this.validate(false);
		}
	});

	if(has("dojo-bidi")){
		Select = declare("dijit.form.Select", Select, {
			_setDisplay: function(/*String*/ newDisplay){
				this.inherited(arguments);
				this.applyTextDir(this.containerNode);
			}
		});
	}

	Select._Menu = _SelectMenu;	// for monkey patching

	// generic event helper to ensure the dropdown items are loaded before the real event handler is called
	function _onEventAfterLoad(method){
		return function(evt){
			if(!this._isLoaded){
				this.loadDropDown(lang.hitch(this, method, evt));
			}else{
				this.inherited(method, arguments);
			}
		};
	}
	Select.prototype._onContainerKeydown = _onEventAfterLoad("_onContainerKeydown");
	Select.prototype._onContainerKeypress = _onEventAfterLoad("_onContainerKeypress");

	return Select;
});
