define([
	"dojo",
	"dijit",
	"dojox",
	"dijit/_editor/_Plugin",
	"dijit/form/Button",
	"dojo/_base/connect",
	"dojo/_base/declare",
	"dojo/i18n",
	"dojo/i18n!dojox/editor/plugins/nls/Preview"
], function(dojo, dijit, dojox, _Plugin) {

dojo.declare("dojox.editor.plugins.Preview", _Plugin, {
	// summary:
	//		This plugin provides Preview capability to the editor.  When
	//		clicked, the document in the editor frame will displayed in a separate
	//		window/tab

	// Over-ride indicating that the command processing is done all by this plugin.
	useDefaultCommand: false,

	// styles: [public] String
	//		A string of CSS styles to apply to the previewed content, if any.
	styles: "",

	// stylesheets: [public] Array
	//		An array of stylesheets to import into the preview, if any.
	stylesheets: null,

	// iconClassPrefix: [const] String
	//		The CSS class name for the button node icon.
	iconClassPrefix: "dijitAdditionalEditorIcon",

	_initButton: function(){
		// summary:
		//		Over-ride for creation of the preview button.
		this._nlsResources = dojo.i18n.getLocalization("dojox.editor.plugins", "Preview");
		this.button = new dijit.form.Button({
			label: this._nlsResources["preview"],
			showLabel: false,
			iconClass: this.iconClassPrefix + " " + this.iconClassPrefix + "Preview",
			tabIndex: "-1",
			onClick: dojo.hitch(this, "_preview")
		});
	},

	setEditor: function(editor){
		// summary:
		//		Over-ride for the setting of the editor.
		// editor: Object
		//		The editor to configure for this plugin to use.
		this.editor = editor;
		this._initButton();
	},

	updateState: function(){
		// summary:
		//		Over-ride for button state control for disabled to work.
		this.button.set("disabled", this.get("disabled"));
	},
	
	_preview: function(){
		// summary:
		//		Function to trigger previewing of the editor document
		// tags:
		//		private
		try{
			var content = this.editor.get("value");
			var head = "\t\t<meta http-equiv='Content-Type' content='text/html; charset=UTF-8'>\n";
			var i;
			// Apply the stylesheets, then apply the styles.
			if(this.stylesheets){
				for(i = 0; i < this.stylesheets.length; i++){
					head += "\t\t<link rel='stylesheet' type='text/css' href='" + this.stylesheets[i] + "'>\n";
				}
			}
			if(this.styles){
				head += ("\t\t<style>" + this.styles + "</style>\n");
			}
			content = "<html>\n\t<head>\n" + head + "\t</head>\n\t<body>\n" + content + "\n\t</body>\n</html>";
			var win = window.open("javascript: ''", this._nlsResources["preview"], "status=1,menubar=0,location=0,toolbar=0");
			win.document.open();
			win.document.write(content);
			win.document.close();

		}catch(e){
			console.warn(e);
		}
	}
});

// Register this plugin.
dojo.subscribe(dijit._scopeName + ".Editor.getPlugin",null,function(o){
	if(o.plugin){ return; }
	var name = o.args.name.toLowerCase();
	if(name === "preview"){
		o.plugin = new dojox.editor.plugins.Preview({
			styles: ("styles" in o.args)?o.args.styles:"",
			stylesheets: ("stylesheets" in o.args)? o.args.stylesheets:null
		});
	}
});

return dojox.editor.plugins.Preview;

});
