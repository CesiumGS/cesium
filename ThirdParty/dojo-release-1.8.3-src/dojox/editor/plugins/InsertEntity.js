define([
	"dojo",
	"dijit",
	"dojox",
	"dijit/_editor/_Plugin",
	"dijit/TooltipDialog",
	"dijit/form/DropDownButton",
	"dojo/_base/connect",
	"dojo/_base/declare",
	"dojo/i18n",
	"dojox/html/entities",
	"dojox/editor/plugins/EntityPalette",
	"dojo/i18n!dojox/editor/plugins/nls/InsertEntity"
], function(dojo, dijit, dojox, _Plugin) {

dojo.declare("dojox.editor.plugins.InsertEntity", _Plugin,{
	// summary:
	//		This plugin allows the user to select from standard Symbols (HTML Entities)
	//		to insert at the current cursor position.  It binds to the key pattern:
	//		ctrl-shift-s for opening the insert symbol dropdown.
	//
	// description:
	//		The commands provided by this plugin are:
	//
	//		- insertEntity - inserts the selected HTML entity character

	// iconClassPrefix: [const] String
	//		The CSS class name for the button node is formed from `iconClassPrefix` and `command`
	iconClassPrefix: "dijitAdditionalEditorIcon",

	_initButton: function(){
		// summary:
		//		Over-ride for creation of the save button.
		this.dropDown = new dojox.editor.plugins.EntityPalette({showCode: this.showCode, showEntityName: this.showEntityName});
		this.connect(this.dropDown, "onChange", function(entity){
			this.button.closeDropDown();
			this.editor.focus();
			this.editor.execCommand("inserthtml",entity);
		});
		var strings = dojo.i18n.getLocalization("dojox.editor.plugins", "InsertEntity");
		this.button = new dijit.form.DropDownButton({
			label: strings["insertEntity"],
			showLabel: false,
			iconClass: this.iconClassPrefix + " " + this.iconClassPrefix + "InsertEntity",
			tabIndex: "-1",
			dropDown: this.dropDown
		});
	},

	updateState: function(){
		// summary:
		//		Over-ride for button state control for disabled to work.
		this.button.set("disabled", this.get("disabled"));
	},

	setEditor: function(editor){
		// summary:
		//		Over-ride for the setting of the editor.
		// editor: Object
		//		The editor to configure for this plugin to use.
		this.editor = editor;
		this._initButton();

		this.editor.addKeyHandler("s", true, true, dojo.hitch(this, function(){
			this.button.openDropDown();
			this.dropDown.focus();
		}));

		editor.contentPreFilters.push(this._preFilterEntities);
		editor.contentPostFilters.push(this._postFilterEntities);
	},

	_preFilterEntities: function(s/*String content passed in*/){
		// summary:
		//		A function to filter out entity characters into their UTF-8 character form
		//		displayed in the editor.  It gets registered with the preFilters
		//		of the editor.
		// tags:
		//		private.
		return dojox.html.entities.decode(s, dojox.html.entities.latin);
	},

	_postFilterEntities: function(s/*String content passed in*/){
		// summary:
		//		A function to filter out entity characters into encoded form so they
		//		are properly displayed in the editor.  It gets registered with the
		//		postFilters of the editor.
		// tags:
		//		private.
		return dojox.html.entities.encode(s, dojox.html.entities.latin);
	}
});

// Register this plugin.
dojo.subscribe(dijit._scopeName + ".Editor.getPlugin",null,function(o){
	if(o.plugin){ return; }
	var name = o.args.name? o.args.name.toLowerCase() : "";
	if(name === "insertentity"){
		o.plugin = new dojox.editor.plugins.InsertEntity({
			showCode: ("showCode" in o.args)?o.args.showCode:false,
			showEntityName: ("showEntityName" in o.args)?o.args.showEntityName:false
		});
	}
});

return dojox.editor.plugins.InsertEntity;
});
