define([
	"dojo",
	"dijit",
	"dojox",
	"dijit/_editor/_Plugin",
	"dijit/form/Button",
	"dojo/_base/connect",
	"dojo/_base/declare",
	"dojo/i18n",
	"dojo/i18n!dojox/editor/plugins/nls/PageBreak"
], function(dojo, dijit, dojox, _Plugin) {

dojo.declare("dojox.editor.plugins.PageBreak", _Plugin, {
	// summary:
	//		This plugin provides a simple CSS page break plugin that
	//		lets your insert browser print recognizable page breaks in
	//		the document.
	//		This plugin registers the hotkey command: CTRL-SHIFT-ENTER

	// Over-ride indicating that the command processing is done all by this plugin.
	useDefaultCommand: false,

	// iconClassPrefix: [const] String
	//		The CSS class name for the button node is formed from
	//		`iconClassPrefix` and `command`
	iconClassPrefix: "dijitAdditionalEditorIcon",

	// _unbreakableNodes: [private] Array
	//		The nodes that should not allow page breaks to be inserted into them.
	_unbreakableNodes: ["li", "ul", "ol"],

	// _pbContent: [private] String
	//		The markup used for the pagebreak insert.
	_pbContent: "<hr style='page-break-after: always;' class='dijitEditorPageBreak'>",

	_initButton: function(){
		// summary:
		//		Over-ride for creation of the resize button.
		var ed = this.editor;
		var strings = dojo.i18n.getLocalization("dojox.editor.plugins", "PageBreak");
		this.button = new dijit.form.Button({
			label: strings["pageBreak"],
			showLabel: false,
			iconClass: this.iconClassPrefix + " " + this.iconClassPrefix + "PageBreak",
			tabIndex: "-1",
			onClick: dojo.hitch(this, "_insertPageBreak")
		});
		ed.onLoadDeferred.addCallback(
			dojo.hitch(this, function(){
				//Register our hotkey to CTRL-SHIFT-ENTER.
				ed.addKeyHandler(dojo.keys.ENTER, true, true, dojo.hitch(this, this._insertPageBreak));
				if(dojo.isWebKit || dojo.isOpera){
					// Webkit and Opera based browsers don't generate keypress events when ctrl and shift are
					// held then enter is pressed.  Odd, that.
					this.connect(this.editor, "onKeyDown", dojo.hitch(this, function(e){
						if((e.keyCode === dojo.keys.ENTER) && e.ctrlKey && e.shiftKey){
							this._insertPageBreak();
						}
					}));
				}
			})
		);
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
	},

	_style: function(){
		// summary:
		//		Internal function for inserting dynamic css.  This was originally
		//		in an editor.onLoadDeferred, but I ran into issues in Chrome with
		//		the tag being ignored.  Having it done at insert worked better.
		// tags:
		//		private
		if(!this._styled){
			this._styled = true;
			var doc = this.editor.document;
			var style = ".dijitEditorPageBreak {\n" +
				"\tborder-top-style: solid;\n" +
				"\tborder-top-width: 3px;\n" +
				"\tborder-top-color: #585858;\n" +
				"\tborder-bottom-style: solid;\n" +
				"\tborder-bottom-width: 1px;\n" +
				"\tborder-bottom-color: #585858;\n" +
				"\tborder-left-style: solid;\n" +
				"\tborder-left-width: 1px;\n" +
				"\tborder-left-color: #585858;\n" +
				"\tborder-right-style: solid;\n" +
				"\tborder-right-width: 1px;\n" +
				"\tborder-right-color: #585858;\n" +
				"\tcolor: #A4A4A4;\n" +
				"\tbackground-color: #A4A4A4;\n" +
				"\theight: 10px;\n"+
				"\tpage-break-after: always;\n" +
				"\tpadding: 0px 0px 0px 0px;\n" +
			"}\n\n" +
			"@media print {\n" +
				"\t.dijitEditorPageBreak { page-break-after: always; " +
				"background-color: rgba(0,0,0,0); color: rgba(0,0,0,0); " +
				"border: 0px none rgba(0,0,0,0); display: hidden; " +
				"width: 0px; height: 0px;}\n" +
			"}";

			if(!dojo.isIE){
				var sNode = doc.createElement("style");
				sNode.appendChild(doc.createTextNode(style));
				doc.getElementsByTagName("head")[0].appendChild(sNode);
			}else{
				var ss = doc.createStyleSheet("");
				ss.cssText = style;
			}
		}
	},

	_insertPageBreak: function(){
		// summary:
		//		Function to insert a CSS page break at the current point in the document
		// tags:
		//		private
		try{
			if(!this._styled){ this._style(); }
			//this.editor.focus();
			if(this._allowBreak()){
				this.editor.execCommand("inserthtml", this._pbContent);
			}
		}catch(e){
			console.warn(e);
		}
	},

	_allowBreak: function(){
		// summary:
		//		Internal function to see if we should allow a page break at the document
		//		location.
		// tags:
		//		private
		var ed = this.editor;
		var doc = ed.document;
		var node = ed._sCall("getSelectedElement", []) || ed._sCall("getParentElement", []);
		while(node && node !== doc.body && node !== doc.html){
			if(ed._sCall("isTag", [node, this._unbreakableNodes])){
				return false;
			}
			node = node.parentNode;
		}
		return true;
	}
});

// Register this plugin.
dojo.subscribe(dijit._scopeName + ".Editor.getPlugin",null,function(o){
	if(o.plugin){ return; }
	var name = o.args.name.toLowerCase();
	if(name === "pagebreak"){
		o.plugin = new dojox.editor.plugins.PageBreak({});
	}
});

return dojox.editor.plugins.PageBreak;

});
