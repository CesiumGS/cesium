define([
	"dojo/_base/declare", // declare
	"dojo/dom-style", // domStyle.getComputedStyle
	"dojo/_base/kernel", // kernel.experimental
	"dojo/_base/lang", // lang.hitch
	"dojo/on",
	"../_Plugin",
	"../../form/ToggleButton"
], function(declare, domStyle, kernel, lang, on, _Plugin, ToggleButton){

	// module:
	//		dijit/_editor/plugins/ToggleDir

	var ToggleDir = declare("dijit._editor.plugins.ToggleDir", _Plugin, {
		// summary:
		//		This plugin is used to toggle direction of the edited document,
		//		independent of what direction the whole page is.

		// Override _Plugin.useDefaultCommand: processing is done in this plugin
		// rather than by sending commands to the Editor
		useDefaultCommand: false,

		command: "toggleDir",

		// Override _Plugin.buttonClass to use a ToggleButton for this plugin rather than a vanilla Button
		buttonClass: ToggleButton,

		_initButton: function(){
			this.inherited(arguments);

			var button = this.button,
				editorLtr = this.editor.isLeftToRight();

			this.own(this.button.on("change", lang.hitch(this, function(checked){
				this.editor.set("textDir", editorLtr ^ checked ? "ltr" : "rtl");
			})));

			// Button should be checked if the editor's textDir is opposite of the editor's dir.
			// Note that the arrow in the icon points in opposite directions depending on the editor's dir.
			var editorDir = editorLtr ? "ltr" : "rtl";
			function setButtonChecked(textDir){
				button.set("checked", textDir && textDir !== editorDir, false);
			}
			setButtonChecked(this.editor.get("textDir"));
			this.editor.watch("textDir", function(name, oval, nval){
				setButtonChecked(nval);
			});
		},

		updateState: function(){
			// summary:
			//		Over-ride for button state control for disabled to work.
			this.button.set("disabled", this.get("disabled"));
		}
	});

	// Register this plugin.
	_Plugin.registry["toggleDir"] = function(){
		return new ToggleDir({command: "toggleDir"});
	};

	return ToggleDir;
});
