define([
	"dojo/_base/declare", // declare
	"dojo/i18n", // i18n.getLocalization
	"dojo/_base/lang", // lang.hitch
	"../_Plugin",
	"../../form/Button",
	"dojo/i18n!../nls/commands"
], function(declare, i18n, lang, _Plugin, Button){

	// module:
	//		dijit/_editor/plugins/NewPage

	var NewPage = declare("dijit._editor.plugins.NewPage", _Plugin, {
		// summary:
		//		This plugin provides a simple 'new page' capability.  In other
		//		words, set content to some default user defined string.

		// content: [public] String
		//		The default content to insert into the editor as the new page.
		//		The default is the `<br>` tag, a single blank line.
		content: "<br>",

		_initButton: function(){
			// summary:
			//		Over-ride for creation of the Print button.
			var strings = i18n.getLocalization("dijit._editor", "commands"),
				editor = this.editor;
			this.button = new Button({
				label: strings["newPage"],
				ownerDocument: editor.ownerDocument,
				dir: editor.dir,
				lang: editor.lang,
				showLabel: false,
				iconClass: this.iconClassPrefix + " " + this.iconClassPrefix + "NewPage",
				tabIndex: "-1",
				onClick: lang.hitch(this, "_newPage")
			});
		},

		setEditor: function(/*dijit/Editor*/ editor){
			// summary:
			//		Tell the plugin which Editor it is associated with.
			// editor: Object
			//		The editor object to attach the newPage capability to.
			this.editor = editor;
			this._initButton();
		},

		updateState: function(){
			// summary:
			//		Over-ride for button state control for disabled to work.
			this.button.set("disabled", this.get("disabled"));
		},

		_newPage: function(){
			// summary:
			//		Function to set the content to blank.
			// tags:
			//		private
			this.editor.beginEditing();
			this.editor.set("value", this.content);
			this.editor.endEditing();
			this.editor.focus();
		}
	});

	// Register this plugin.
	// For back-compat accept "newpage" (all lowercase) too, remove in 2.0
	_Plugin.registry["newPage"] = _Plugin.registry["newpage"] = function(args){
		return new NewPage({
			content: ("content" in args) ? args.content : "<br>"
		});
	};

	return NewPage;
});
