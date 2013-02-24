define([
	"dojo/_base/array", // array.forEach
	"dojo/_base/declare", // declare
	"dojo/dom-attr", // domAttr.set
	"dojo/dom-class", // domClass.add domClass.remove domClass.toggle
	"dojo/dom-geometry", // domGeometry.setMarginBox
	"dojo/_base/event", // event.stop
	"dojo/i18n", // i18n.getLocalization
	"dojo/_base/lang", // lang.hitch
	"dojo/sniff", // has("ie")
	"./_FormSelectWidget",
	"../_HasDropDown",
	"../Menu",
	"../MenuItem",
	"../MenuSeparator",
	"../Tooltip",
	"dojo/text!./templates/Select.html",
	"dojo/i18n!./nls/validate"
], function(array, declare, domAttr, domClass, domGeometry, event, i18n, lang, has,
			_FormSelectWidget, _HasDropDown, Menu, MenuItem, MenuSeparator, Tooltip, template){

// module:
//		dijit/form/Select


var _SelectMenu = declare("dijit.form._SelectMenu", Menu, {
	// summary:
	//		An internally-used menu for dropdown that allows us a vertical scrollbar

	// Override Menu.autoFocus setting so that opening a Select highlights the current value.
	autoFocus: true,

	buildRendering: function(){
		// summary:
		//		Stub in our own changes, so that our domNode is not a table
		//		otherwise, we won't respond correctly to heights/overflows
		this.inherited(arguments);
		var o = (this.menuTableNode = this.domNode);
		var n = (this.domNode = this.ownerDocument.createElement("div"));
		n.style.cssText = "overflow-x: hidden; overflow-y: scroll";
		if(o.parentNode){
			o.parentNode.replaceChild(n, o);
		}
		domClass.remove(o, "dijitMenuTable");
		n.className = o.className + " dijitSelectMenu";
		o.className = "dijitReset dijitMenuTable";
		o.setAttribute("role", "listbox");
		n.setAttribute("role", "presentation");
		n.appendChild(o);
	},

	postCreate: function(){
		// summary:
		//		stop mousemove from selecting text on IE to be consistent with other browsers

		this.inherited(arguments);

		this.connect(this.domNode, "onselectstart", event.stop);
	},


	focus: function(){
		// summary:
		//		Overridden so that the previously selected value will be focused instead of only the first item
		var	found = false,
			val = this.parentWidget.value;
		if(lang.isArray(val)){
			val = val[val.length-1];
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
	},

	resize: function(/*Object*/ mb){
		// summary:
		//		Overridden so that we are able to handle resizing our
		//		internal widget.  Note that this is not a "full" resize
		//		implementation - it only works correctly if you pass it a
		//		marginBox.
		//
		// mb: Object
		//		The margin box to set this dropdown to.
		if(mb){
			domGeometry.setMarginBox(this.domNode, mb);
			if("w" in mb){
				// We've explicitly set the wrapper <div>'s width, so set <table> width to match.
				// 100% is safer than a pixel value because there may be a scroll bar with
				// browser/OS specific width.
				this.menuTableNode.style.width = "100%";
			}
		}
	}
});

var Select = declare("dijit.form.Select", [_FormSelectWidget, _HasDropDown], {
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
	emptyLabel: "&#160;",	// &nbsp;

	// _isLoaded: Boolean
	//		Whether or not we have been loaded
	_isLoaded: false,

	// _childrenLoaded: Boolean
	//		Whether or not our children have been loaded
	_childrenLoaded: false,

	_fillContent: function(){
		// summary:
		//		Set the value to be the first, or the selected index
		this.inherited(arguments);
		// set value from selected option
		if(this.options.length && !this.value && this.srcNodeRef){
			var si = this.srcNodeRef.selectedIndex || 0; // || 0 needed for when srcNodeRef is not a SELECT
			this.value = this.options[si >= 0 ? si : 0].value;
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
				label: option.label || this.emptyLabel,
				onClick: click,
				ownerDocument: this.ownerDocument,
				dir: this.dir,
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
			}
			if(this.options.length){
				this.inherited(arguments);
			}else{
				// Drop down menu is blank but add one blank entry just so something appears on the screen
				// to let users know that they are no choices (mimicing native select behavior)
				array.forEach(this._getChildren(), function(child){ child.destroyRecursive(); });
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
		var lbl = newDisplay || this.emptyLabel;
		this.containerNode.innerHTML = '<span role="option" class="dijitReset dijitInline ' + this.baseClass.replace(/\s+|$/g, "Label ")+'">' + lbl + '</span>';
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
		// summary:
		//		stop mousemove from selecting text on IE to be consistent with other browsers

		this.inherited(arguments);
 
		this.connect(this.domNode, "onselectstart", event.stop);
		this.domNode.setAttribute("aria-expanded", "false");
		
		if(has("ie") < 9){
			// IE INPUT tag fontFamily has to be set directly using STYLE
			// the defer gives IE a chance to render the TextBox and to deal with font inheritance
			this.defer(function(){
				try{
					var s = domStyle.getComputedStyle(this.domNode); // can throw an exception if widget is immediately destroyed
					if(s){
						var ff = s.fontFamily;
						if(ff){
							var inputs = this.domNode.getElementsByTagName("INPUT");
							if(inputs){
								for(var i=0; i < inputs.length; i++){
									inputs[i].style.fontFamily = ff;
								}
							}
						}
					}
				}catch(e){/*when used in a Dialog, and this is called before the dialog is
				 shown, s.fontFamily would trigger "Invalid Argument" error.*/}
			});
		}
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

	closeDropDown: function(){
		// overriding _HasDropDown.closeDropDown()
		this.inherited(arguments);

		if(this.dropDown && this.dropDown.menuTableNode){
			// Erase possible width: 100% setting from _SelectMenu.resize().
			// Leaving it would interfere with the next openDropDown() call, which
			// queries the natural size of the drop down.
			this.dropDown.menuTableNode.style.width = "";
		}
	},

	destroy: function(preserveDom){
		if(this.dropDown && !this.dropDown._destroyed){
			this.dropDown.destroyRecursive(preserveDom);
			delete this.dropDown;
		}
		this.inherited(arguments);
	},

	_onFocus: function(){
		this.validate(true);	// show tooltip if second focus of required tooltip, but no selection
		this.inherited(arguments);
	},

	_onBlur: function(){
		Tooltip.hide(this.domNode);
		this.inherited(arguments);
		this.validate(false);
	}
});

Select._Menu = _SelectMenu;	// for monkey patching

return Select;
});
