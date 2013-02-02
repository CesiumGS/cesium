define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/_base/event",
	"dojo/dom-geometry",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dojo/i18n",
	"dijit/_WidgetBase",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin",
	"dijit/registry",
	"dijit/Menu",
	"dijit/MenuItem",
	"dijit/Tooltip",
	"dijit/form/_FormSelectWidget",
	"dijit/form/ComboButton",
	"dojo/text!dojox/form/resources/_CheckedMultiSelectMenuItem.html",
	"dojo/text!dojox/form/resources/_CheckedMultiSelectItem.html",
	"dojo/text!dojox/form/resources/CheckedMultiSelect.html",
	"dojo/i18n!dojox/form/nls/CheckedMultiSelect",
	"dijit/form/CheckBox" // template
], function(declare, lang, array, event, domGeometry, domClass, domConstruct, i18n, Widget, TemplatedMixin, WidgetsInTemplateMixin, registry, Menu, MenuItem, Tooltip, FormSelectWidget, ComboButton, CheckedMultiSelectMenuItem, CheckedMultiSelectItem, CheckedMultiSelect, nlsCheckedMultiSelect){

// module:
//		dojox/form/CheckedMultiSelect
// summary:
//		Extends the core dojox.form.CheckedMultiSelect to provide a "checkbox" selector


var formCheckedMultiSelectItem = declare("dojox.form._CheckedMultiSelectItem", [Widget, TemplatedMixin, WidgetsInTemplateMixin], {
	// summary:
	//		The individual items for a CheckedMultiSelect

	templateString: CheckedMultiSelectItem,

	baseClass: "dojoxMultiSelectItem",

	// option: dojox.form.__SelectOption
	//		The option that is associated with this item
	option: null,
	parent: null,

	// disabled: boolean
	//		Whether or not this widget is disabled
	disabled: false,

	// readOnly: boolean
	//		Whether or not this widget is readOnly
	readOnly: false,

	postMixInProperties: function(){
		// summary:
		//		Set the appropriate _subClass value - based on if we are multi-
		//		or single-select
		this._type = this.parent.multiple ?
			{type: "checkbox", baseClass: "dijitCheckBox"} :
			{type: "radio", baseClass: "dijitRadio"};
		this.disabled = this.option.disabled = this.option.disabled||false;
		this.inherited(arguments);
	},

	postCreate: function(){
		// summary:
		//		Set innerHTML here - since the template gets messed up sometimes
		//		with rich text
		this.inherited(arguments);
		this.labelNode.innerHTML = this.option.label;
	},

	_changeBox: function(){
		// summary:
		//		Called to force the select to match the state of the check box
		//		(only on click of the checkbox)	 Radio-based calls _setValueAttr
		//		instead.
		if(this.get("disabled") || this.get("readOnly")){ return; }
		if(this.parent.multiple){
			this.option.selected = this.checkBox.get('value') && true;
		}else{
			this.parent.set('value', this.option.value);
		}
		// fire the parent's change
		this.parent._updateSelection();

		// refocus the parent
		this.parent.focus();
	},

	_onClick: function(e){
		// summary:
		//		Sets the click state (passes through to the check box)
		if(this.get("disabled") || this.get("readOnly")){
			event.stop(e);
		}else{
			this.checkBox._onClick(e);
		}
	},

	_updateBox: function(){
		// summary:
		//		Called to force the box to match the state of the select
		this.checkBox.set('value', this.option.selected);
	},

	_setDisabledAttr: function(value){
		// summary:
		//		Disables (or enables) all the children as well
		this.disabled = value||this.option.disabled;
		this.checkBox.set("disabled", this.disabled);
		domClass.toggle(this.domNode, "dojoxMultiSelectDisabled", this.disabled);
	},

	_setReadOnlyAttr: function(value){
		// summary:
		//		Sets read only (or unsets) all the children as well
		this.checkBox.set("readOnly", value);
		this.readOnly = value;
	}
});

var formCheckedMultiSelectMenu = declare("dojox.form._CheckedMultiSelectMenu", Menu, {
	// summary:
	//		An internally-used menu for dropdown that allows us a vertical scrollbar

	multiple: false,

	buildRendering: function(){
		// summary:
		//		Stub in our own changes, so that our domNode is not a table
		//		otherwise, we won't respond correctly to heights/overflows
		this.inherited(arguments);
		var o = (this.menuTableNode = this.domNode),
		n = (this.domNode = domConstruct.create("div", {style: {overflowX: "hidden", overflowY: "scroll"}}));
		if(o.parentNode){
			o.parentNode.replaceChild(n, o);
		}
		domClass.remove(o, "dijitMenuTable");
		n.className = o.className + " dojoxCheckedMultiSelectMenu";
		o.className = "dijitReset dijitMenuTable";
		o.setAttribute("role", "listbox");
		n.setAttribute("role", "presentation");
		n.appendChild(o);
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
	},

	onClose: function(){
		this.inherited(arguments);
		if(this.menuTableNode){
			// Erase possible width: 100% setting from _SelectMenu.resize().
			// Leaving it would interfere with the next openDropDown() call, which
			// queries the natural size of the drop down.
			this.menuTableNode.style.width = "";
		}
	},

	onItemClick: function(/*dijit._Widget*/ item, /*Event*/ evt){
		// summary:
		//		Handle clicks on an item.
		// tags:
		//		private
		
		// this can't be done in _onFocus since the _onFocus events occurs asynchronously
		if(typeof this.isShowingNow == 'undefined'){ // non-popup menu
			this._markActive();
		}

		this.focusChild(item);

		if(item.disabled || item.readOnly){ return false; }

		if(!this.multiple){
			// before calling user defined handler, close hierarchy of menus
			// and restore focus to place it was when menu was opened
			this.onExecute();
		}
		// user defined handler for click
		item.onClick(evt);
	}
});

var formCheckedMultiSelectMenuItem = declare("dojox.form._CheckedMultiSelectMenuItem", MenuItem, {
	// summary:
	//		A checkbox-like menu item for toggling on and off

	templateString: CheckedMultiSelectMenuItem,

	// option: dojox.form.__SelectOption
	//		The option that is associated with this item
	option: null,

	// reference of dojox.form._CheckedMultiSelectMenu
	parent: null,

	// icon of the checkbox/radio button
	_iconClass: "",

	postMixInProperties: function(){
		// summary:
		//		Set the appropriate _subClass value - based on if we are multi-
		//		or single-select
		if(this.parent.multiple){
			this._iconClass = "dojoxCheckedMultiSelectMenuCheckBoxItemIcon";
			this._type = {type: "checkbox"};
		}else{
			this._iconClass = "";
			this._type = {type: "hidden"};
		}
		this.disabled = this.option.disabled;
		this.checked = this.option.selected;
		this.label = this.option.label;
		this.readOnly = this.option.readOnly;
		this.inherited(arguments);
	},

	onChange: function(/*Boolean*/ checked){
		// summary:
		//		User defined function to handle check/uncheck events
		// tags:
		//		callback
	},

	_updateBox: function(){
		// summary:
		//		Called to force the box to match the state of the select
		domClass.toggle(this.domNode, "dojoxCheckedMultiSelectMenuItemChecked", !!this.option.selected);
		this.domNode.setAttribute("aria-checked", this.option.selected);
		this.inputNode.checked = this.option.selected;
		if(!this.parent.multiple){
			domClass.toggle(this.domNode, "dijitSelectSelectedOption", !!this.option.selected);
		}
	},

	_onClick: function(/*Event*/ e){
		// summary:
		//		Clicking this item just toggles its state
		// tags:
		//		private
		if(!this.disabled && !this.readOnly){
			if(this.parent.multiple){
				this.option.selected = !this.option.selected;
				this.parent.onChange();
				this.onChange(this.option.selected);
			}else{
				if(!this.option.selected){
					array.forEach(this.parent.getChildren(), function(item){
						item.option.selected = false;
					});
					this.option.selected = true;
					this.parent.onChange();
					this.onChange(this.option.selected);
				}
			}
		}
		this.inherited(arguments);
	}
});

var formCheckedMultiSelect = declare("dojox.form.CheckedMultiSelect", FormSelectWidget, {
	// summary:
	//		Extends the core dijit MultiSelect to provide a "checkbox" selector

	templateString: CheckedMultiSelect,

	baseClass: "dojoxCheckedMultiSelect",

	// required: Boolean
	//		User is required to check at least one item.
	required: false,

	// invalidMessage: String
	//		The message to display if value is invalid.
	invalidMessage: "$_unset_$",

	// _message: String
	//		Currently displayed message
	_message: "",

	// dropDown: Boolean
	//		Drop down version or not
	dropDown: false,

	// labelText: String
	//		Label of the drop down button
	labelText: "",

	// tooltipPosition: String[]
	//		See description of `Tooltip.defaultPosition` for details on this parameter.
	tooltipPosition: [],

	setStore: function(store, selectedValue, fetchArgs){
		// summary:
		//		If there is any items selected in the store, the value
		//		of the widget will be set to the values of these items.
		this.inherited(arguments);
		var setSelectedItems = function(items){
			var value = array.map(items, function(item){ return item.value[0]; });
			if(value.length){
				this.set("value", value);
			}
		};
		this.store.fetch({query:{selected: true}, onComplete: setSelectedItems, scope: this});
	},

	postMixInProperties: function(){
		this.inherited(arguments);
		this._nlsResources = i18n.getLocalization("dojox.form", "CheckedMultiSelect", this.lang);
		if(this.invalidMessage == "$_unset_$"){ this.invalidMessage = this._nlsResources.invalidMessage; }
	},

	_fillContent: function(){
		// summary:
		//		Set the value to be the first, or the selected index
		this.inherited(arguments);

		// set value from selected option
		if(this.options.length && !this.value && this.srcNodeRef){
			var si = this.srcNodeRef.selectedIndex || 0; // || 0 needed for when srcNodeRef is not a SELECT
			this.value = this.options[si >= 0 ? si : 0].value;
		}
		if(this.dropDown){
			domClass.toggle(this.selectNode, "dojoxCheckedMultiSelectHidden");
			this.dropDownMenu = new formCheckedMultiSelectMenu({
				id: this.id + "_menu",
				style: "display: none;",
				multiple: this.multiple,
				onChange: lang.hitch(this, "_updateSelection")
			});
		}
	},

	startup: function(){
		// summary:
		//		Set the value to be the first, or the selected index
		this.inherited(arguments);
		if(this.dropDown){
			this.dropDownButton = new ComboButton({
				label: this.labelText,
				dropDown: this.dropDownMenu,
				baseClass: "dojoxCheckedMultiSelectButton",
				maxHeight: this.maxHeight
			}, this.comboButtonNode);
		}
	},

	_onMouseDown: function(e){
		// summary:
		//		Cancels the mousedown event to prevent others from stealing
		//		focus
		event.stop(e);
	},

	validator: function(){
		// summary:
		//		Overridable function used to validate that an item is selected if required =
		//		true.
		// tags:
		//		protected
		if(!this.required){ return true; }
		return array.some(this.getOptions(), function(opt){
			return opt.selected && opt.value != null && opt.value.toString().length != 0;
		});
	},

	validate: function(isFocused){
		Tooltip.hide(this.domNode);
		var isValid = this.isValid(isFocused);
		if(!isValid){ this.displayMessage(this.invalidMessage); }
		return isValid;
	},

	isValid: function(/*Boolean*/ isFocused){
		// summary:
		//		Tests if the required items are selected.
		//		Can override with your own routine in a subclass.
		// tags:
		//		protected
		return this.validator();
	},

	getErrorMessage: function(/*Boolean*/ isFocused){
		// summary:
		//		Return an error message to show if appropriate
		// tags:
		//		protected
		return this.invalidMessage;
	},

	displayMessage: function(/*String*/ message){
		// summary:
		//		Overridable method to display validation errors/hints.
		//		By default uses a tooltip.
		// tags:
		//		extension
		Tooltip.hide(this.domNode);
		if(message){
			Tooltip.show(message, this.domNode, this.tooltipPosition);
		}
	},

	onAfterAddOptionItem: function(item, option){
		// summary:
		//		a function that can be connected to in order to receive a
		//		notification that an item as been added to this dijit.
	},

	_addOptionItem: function(/*dojox.form.__SelectOption*/ option){
		var item;
		if(this.dropDown){
			item = new formCheckedMultiSelectMenuItem({
				option: option,
				parent: this.dropDownMenu
			});
			this.dropDownMenu.addChild(item);
		}else{
			item = new formCheckedMultiSelectItem({
				option: option,
				parent: this
			});
			this.wrapperDiv.appendChild(item.domNode);
		}
		this.onAfterAddOptionItem(item, option);
	},

	_refreshState: function(){
		// summary:
		//		Validate if selection changes.
		this.validate(this.focused);
	},

	onChange: function(newValue){
		// summary:
		//		Validate if selection changes.
		this._refreshState();
	},

	reset: function(){
		// Overridden so that the state will be cleared.
		this.inherited(arguments);
		Tooltip.hide(this.domNode);
	},

	_updateSelection: function(){
		this.inherited(arguments);
		this._handleOnChange(this.value);
		array.forEach(this._getChildren(), function(item){
			item._updateBox();
		});
		domConstruct.empty(this.containerNode);
		var self = this;
		array.forEach(this.value, function(item){
			var opt = domConstruct.create("option", {
				"value": item,
				"label": item,
				"selected": "selected"
			});
			domConstruct.place(opt, self.containerNode);
		});
		if(this.dropDown && this.dropDownButton){
			var i = 0, label = "";
			array.forEach(this.options, function(option){
				if(option.selected){
					i++;
					label = option.label;
				}
			});
			this.dropDownButton.set("label", this.multiple ?
				lang.replace(this._nlsResources.multiSelectLabelText, {num: i}) :
				label);
		}
	},

	_getChildren: function(){
		if(this.dropDown){
			return this.dropDownMenu.getChildren();
		}else{
			return array.map(this.wrapperDiv.childNodes, function(n){
				return registry.byNode(n);
			});
		}
	},

	invertSelection: function(onChange){
		// summary:
		//		Invert the selection
		// onChange: Boolean
		//		If null, onChange is not fired.
		if(this.multiple){
			array.forEach(this.options, function(i){
				i.selected = !i.selected;
			});
			this._updateSelection();
		}
	},

	_setDisabledAttr: function(value){
		// summary:
		//		Disable (or enable) all the children as well
		this.inherited(arguments);
		if(this.dropDown){
			this.dropDownButton.set("disabled", value);
		}
		array.forEach(this._getChildren(), function(node){
			if(node && node.set){
				node.set("disabled", value);
			}
		});
	},

	_setReadOnlyAttr: function(value){
		// summary:
		//		Sets read only (or unsets) all the children as well
		this.inherited(arguments);
		if("readOnly" in this.attributeMap){
			this._attrToDom("readOnly", value);
		}
		this.readOnly = value;
		array.forEach(this._getChildren(), function(node){
			if(node && node.set){
				node.set("readOnly", value);
			}
		});
	},

	uninitialize: function(){
		Tooltip.hide(this.domNode);
		// Make sure these children are destroyed
		array.forEach(this._getChildren(), function(child){
			child.destroyRecursive();
		});
		this.inherited(arguments);
	}
});

return formCheckedMultiSelect;
});