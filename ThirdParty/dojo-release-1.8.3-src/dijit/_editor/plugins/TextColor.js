define([
	"require",
	"dojo/colors", // colors.fromRgb
	"dojo/_base/declare", // declare
	"dojo/_base/lang",
	"../_Plugin",
	"../../form/DropDownButton"
], function(require, colors, declare, lang, _Plugin, DropDownButton){

// module:
//		dijit/_editor/plugins/TextColor


var TextColor = declare("dijit._editor.plugins.TextColor", _Plugin, {
	// summary:
	//		This plugin provides dropdown color pickers for setting text color and background color
	// description:
	//		The commands provided by this plugin are:
	//
	//		- foreColor - sets the text color
	//		- hiliteColor - sets the background color

	// Override _Plugin.buttonClass to use DropDownButton (with ColorPalette) to control this plugin
	buttonClass: DropDownButton,

	// useDefaultCommand: Boolean
	//		False as we do not use the default editor command/click behavior.
	useDefaultCommand: false,

	_initButton: function(){
		this.inherited(arguments);

		// Setup to lazy load ColorPalette first time the button is clicked
		var self = this;
		this.button.loadDropDown = function(callback){
			require(["../../ColorPalette"], lang.hitch(this, function(ColorPalette){
				this.dropDown = new ColorPalette({
					dir: self.editor.dir,
					ownerDocument: self.editor.ownerDocument,
					value: self.value,
					onChange: function(color){
						self.editor.execCommand(self.command, color);
					}
				});
				callback();
			}));
		};
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

		if(this.button){
			var disabled = this.get("disabled");
			this.button.set("disabled", disabled);
			if(disabled){ return; }

			var value;
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
				value = colors.fromRgb(value).toHex();
			}
		}else{	//it's an integer(IE returns an MS access #)
			value =((value & 0x0000ff)<< 16)|(value & 0x00ff00)|((value & 0xff0000)>>> 16);
			value = value.toString(16);
			value = "#000000".slice(0, 7 - value.length)+ value;

		}

		this.value = value;

		var dropDown = this.button.dropDown;
		if(dropDown && value !== dropDown.get('value')){
			dropDown.set('value', value, false);
		}
	}
});

// Register this plugin.
_Plugin.registry["foreColor"] = function(){
	return new TextColor({command: "foreColor"});
};
_Plugin.registry["hiliteColor"] = function(){
	return new TextColor({command: "hiliteColor"});
};


return TextColor;
});
