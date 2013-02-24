define([
	"dojo",
	"dijit",
	"dojox",
	"dijit/_base/popup",
	"dijit/_Widget",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin",
	"dijit/_editor/_Plugin",
	"dijit/TooltipDialog",
	"dijit/form/Button",
	"dijit/form/DropDownButton",
	"dojox/widget/ColorPicker",
	"dojo/_base/connect",
	"dojo/_base/declare",
	"dojo/i18n",
	"dojo/i18n!dojox/editor/plugins/nls/TextColor"
], function(dojo, dijit, dojox, popup, _Widget, _TemplatedMixin, _WidgetsInTemplateMixin, _Plugin) {

dojo.experimental("dojox.editor.plugins.TextColor");
dojo.declare("dojox.editor.plugins._TextColorDropDown", [_Widget, _TemplatedMixin, _WidgetsInTemplateMixin], {
	// summary:
	//		A sample widget that uses/creates a dropdown with a dojox.widget.ColorPicker.  Also provides
	//		passthroughs to the value of the color picker and convenient hook points.
	// tags:
	//		private

	// templateString: String
	//		The template used to create the ColorPicker.
	templateString: "<div style='display: none; position: absolute; top: -10000; z-index: -10000'>" +
		"<div dojoType='dijit.TooltipDialog' dojoAttachPoint='dialog' class='dojoxEditorColorPicker'>" +
			"<div dojoType='dojox.widget.ColorPicker' dojoAttachPoint='_colorPicker'></div>" +
			"<br>" +
			"<center>" +
				"<button dojoType='dijit.form.Button' type='button' dojoAttachPoint='_setButton'>${setButtonText}</button>" +
				"&nbsp;" +
				"<button dojoType='dijit.form.Button' type='button' dojoAttachPoint='_cancelButton'>${cancelButtonText}</button>" +
			"</center>" +
		"</div>" +
		"</div>",

	// widgetsInTemplate: Boolean
	//		Flag denoting widgets are contained in the template.
	widgetsInTemplate: true,

	constructor: function(){
		// summary:
		//		Constructor over-ride so that the translated strings are mixsed in so
		//		the template fills out.
		var strings = dojo.i18n.getLocalization("dojox.editor.plugins", "TextColor");
		dojo.mixin(this, strings);
	},

	startup: function(){
		// summary:
		//		Over-ride of startup to do the basic connect setups and such.
		if(!this._started){
			this.inherited(arguments);
			this.connect(this._setButton, "onClick", dojo.hitch(this, function(){
				this.onChange(this.get("value"));
			}));
			this.connect(this._cancelButton, "onClick", dojo.hitch(this, function(){
				dijit.popup.close(this.dialog);
				this.onCancel();
			}));
			// Fully statred, so go ahead and remove the hide.
			dojo.style(this.domNode, "display", "block");
		}
	},

	_setValueAttr: function(value, priorityChange){
		// summary:
		//		Passthrough function for the color picker value.
		// value: String
		//		The value to set in the color picker
		// priorityChange:
		//		Value to indicate whether or not to trigger an onChange event.
		this._colorPicker.set("value", value, priorityChange);
	},

	_getValueAttr: function(){
		// summary:
		//		Passthrough function for the color picker value.
		return this._colorPicker.get("value");
	},

	onChange: function(value){
		// summary:
		//		Hook point to get the value when the color picker value is selected.
		// value: String
		//		The value from the color picker.
	},

	onCancel: function(){
		// summary:
		//		Hook point to get when the dialog is canceled.
	}
});


dojo.declare("dojox.editor.plugins.TextColor", _Plugin, {
	// summary:
	//		This plugin provides dropdown color pickers for setting text color and background color
	//		and makes use of the nicer-looking (though not entirely accessible), dojox.widget.ColorPicker.
	//
	// description:
	//		The commands provided by this plugin are:
	//
	//		- foreColor - sets the text color
	//		- hiliteColor - sets the background color
	
	// Override _Plugin.buttonClass to use DropDownButton (with ColorPalette) to control this plugin
	buttonClass: dijit.form.DropDownButton,
	
	// False as we do not use the default editor command/click behavior.
	useDefaultCommand: false,

	constructor: function(){
		this._picker = new dojox.editor.plugins._TextColorDropDown();
		dojo.body().appendChild(this._picker.domNode);
		this._picker.startup();
		this.dropDown = this._picker.dialog;
		this.connect(this._picker, "onChange", function(color){
			this.editor.execCommand(this.command, color);
		});
		this.connect(this._picker, "onCancel", function(){
			this.editor.focus();
		});
	},

	updateState: function(){
		// summary:
		//		Overrides _Plugin.updateState().  This updates the ColorPalette
		//		to show the color of the currently selected text.
		// tags:
		//		protected
		var _e = this.editor;
		var _c = this.command;
		if(!_e || !_e.isLoaded || !_c.length){
			return;
		}
		
		var disabled = this.get("disabled");
		
		var value;
		if(this.button){
			this.button.set("disabled", disabled);
			if(disabled){
				return;
			}
			try{
				value = _e.queryCommandValue(_c)|| "";
			}catch(e){
				//Firefox may throw error above if the editor is just loaded, ignore it
				value = "";
			}
		}
		
		if(value == ""){
			value = "#000000";
		}
		if(value == "transparent"){
			value = "#ffffff";
		}

		if(typeof value == "string"){
			//if RGB value, convert to hex value
			if(value.indexOf("rgb")> -1){
				value = dojo.colorFromRgb(value).toHex();
			}
		}else{	//it's an integer(IE returns an MS access #)
			value =((value & 0x0000ff)<< 16)|(value & 0x00ff00)|((value & 0xff0000)>>> 16);
			value = value.toString(16);
			value = "#000000".slice(0, 7 - value.length)+ value;
			
		}
		
		if(value !== this._picker.get('value')){
			this._picker.set('value', value, false);
		}
	},

	destroy: function(){
		// summary:
		//		Over-ride cleanup function.
		this.inherited(arguments);
		this._picker.destroyRecursive();
		delete this._picker;
	}
});

// Register this plugin.  Uses the same name as the dijit one, so you
// use one or the other, not both.
dojo.subscribe(dijit._scopeName + ".Editor.getPlugin", null, function(o){
	if(o.plugin){
		return;
	}
	switch(o.args.name){
		case "foreColor":
		case "hiliteColor":
			o.plugin = new dojox.editor.plugins.TextColor({
				command: o.args.name
			});
	}
});

return dojox.editor.plugins.TextColor;

});
