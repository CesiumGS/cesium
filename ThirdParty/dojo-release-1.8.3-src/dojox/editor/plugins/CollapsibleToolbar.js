define([
	"dojo",
	"dijit",
	"dojox",
	"dijit/_Widget",
	"dijit/_TemplatedMixin",
	"dijit/_editor/_Plugin",
	"dijit/form/Button",
	"dijit/focus",
	"dojo/_base/connect",
	"dojo/_base/declare",
	"dojo/i18n",
	"dojo/i18n!dojox/editor/plugins/nls/CollapsibleToolbar"
], function(dojo, dijit, dojox, _Widget, _TemplatedMixin, _Plugin) {

dojo.declare("dojox.editor.plugins._CollapsibleToolbarButton", [_Widget, _TemplatedMixin], {
	// summary:
	//		Simple internal widget for representing a clickable button for expand/collapse
	//		with A11Y support.
	// tags:
	//		private
	templateString: "<div tabindex='0' role='button' title='${title}' class='${buttonClass}' " +
		"dojoAttachEvent='ondijitclick: onClick'><span class='${textClass}'>${text}</span></div>",


	// title [public] String
	//		The text to read by a screen reader that gets button focus.
	title: "",

	// buttonClass [public] String
	//		The classname to apply to the expand/collapse button.
	buttonClass: "",

	// text [public] String
	//		The text to use as expand/collapse in A11Y mode.
	text: "",
	
	// textClass [public] String
	//		The classname to apply to the expand/collapse text.
	textClass: "",

	onClick: function(e){
		// summary:
		//		Simple synthetic event to listen for dijit click events (mouse or keyboard)
	}
});


dojo.declare("dojox.editor.plugins.CollapsibleToolbar", _Plugin, {
	// summary:
	//		This plugin provides a weappable toolbar container to allow expand/collapse
	//		of the editor toolbars.  This plugin should be registered first in most cases to
	//		avoid conflicts in toolbar construction.

	// _myWidgets: [private] Array
	//		Container for widgets I allocate that will need to be destroyed.
	_myWidgets: null,

	setEditor: function(editor){
		// summary:
		//		Over-ride for the setting of the editor.
		// editor: Object
		//		The editor to configure for this plugin to use.
		this.editor = editor;
		this._constructContainer();
	},

	_constructContainer: function(){
		// summary:
		//		Internal function to construct a wrapper for the toolbar/header that allows
		//		it to expand and collapse.  It effectively builds a containing table,
		//		which handles the layout nicely and gets BIDI support by default.
		// tags:
		//		private
		var strings = dojo.i18n.getLocalization("dojox.editor.plugins", "CollapsibleToolbar");
		this._myWidgets = [];
		
		// Build the containers.
		var container = dojo.create("table", {style: { width: "100%" }, tabindex: -1, "class": "dojoxCollapsibleToolbarContainer"});
		var tbody = dojo.create("tbody", {tabindex: -1}, container);
		var row = dojo.create("tr", {tabindex: -1}, tbody);
		var openTd = dojo.create("td", {"class": "dojoxCollapsibleToolbarControl", tabindex: -1}, row);
		var closeTd = dojo.create("td", {"class": "dojoxCollapsibleToolbarControl",  tabindex: -1}, row);
		var menuTd = dojo.create("td", {style: { width: "100%" }, tabindex: -1}, row);
		var m = dojo.create("span", {style: { width: "100%" }, tabindex: -1}, menuTd);

		var collapseButton = new dojox.editor.plugins._CollapsibleToolbarButton({
			buttonClass: "dojoxCollapsibleToolbarCollapse",
			title: strings.collapse,
			text: "-",
			textClass: "dojoxCollapsibleToolbarCollapseText"
		});
		dojo.place(collapseButton.domNode, openTd);
		var expandButton = new dojox.editor.plugins._CollapsibleToolbarButton({
			buttonClass: "dojoxCollapsibleToolbarExpand",
			title: strings.expand,
			text: "+",
			textClass: "dojoxCollapsibleToolbarExpandText"
		});
		dojo.place(expandButton.domNode, closeTd);

		this._myWidgets.push(collapseButton);
		this._myWidgets.push(expandButton);

		// Attach everything in now.
		dojo.style(closeTd, "display", "none");
		dojo.place(container, this.editor.toolbar.domNode, "after");
		dojo.place(this.editor.toolbar.domNode, m);

		this.openTd = openTd;
		this.closeTd = closeTd;
		this.menu = m;

		// Establish the events to handle open/close.
		this.connect(collapseButton, "onClick", "_onClose");
		this.connect(expandButton, "onClick", "_onOpen");
	},

	_onClose: function(e){
		// summary:
		//		Internal function for handling a click event that will close the toolbar.
		// e:
		//		The click event.
		// tags:
		//		private
		if(e){ dojo.stopEvent(e); }
		var size = dojo.marginBox(this.editor.domNode);
		dojo.style(this.openTd, "display", "none");
		dojo.style(this.closeTd, "display", "");
		dojo.style(this.menu, "display", "none");
		this.editor.resize({h: size.h});
		// work around IE rendering glitch in a11y mode.
		if(dojo.isIE){
			this.editor.header.className = this.editor.header.className;
			this.editor.footer.className = this.editor.footer.className;
		}
		dijit.focus(this.closeTd.firstChild);
	},

	_onOpen: function(e) {
		// summary:
		//		Internal function for handling a click event that will open the toolbar.
		// e:
		//		The click event.
		// tags:
		//		private
		if(e){ dojo.stopEvent(e); }
		var size = dojo.marginBox(this.editor.domNode);
		dojo.style(this.closeTd, "display", "none");
		dojo.style(this.openTd, "display", "");
		dojo.style(this.menu, "display", "");
		this.editor.resize({h: size.h});
		 // work around IE rendering glitch in a11y mode.
		if(dojo.isIE){
			this.editor.header.className = this.editor.header.className;
			this.editor.footer.className = this.editor.footer.className;
		}
		dijit.focus(this.openTd.firstChild);
	},

	destroy: function(){
		// summary:
		//		Over-ride of destroy method for cleanup.
		this.inherited(arguments);
		if(this._myWidgets){
			while(this._myWidgets.length){
				this._myWidgets.pop().destroy();
			}
			delete this._myWidgets;
		}
	}
});

// Register this plugin.
dojo.subscribe(dijit._scopeName + ".Editor.getPlugin",null,function(o){
	if(o.plugin){ return; }
	var name = o.args.name.toLowerCase();
	if(name === "collapsibletoolbar"){
		o.plugin = new dojox.editor.plugins.CollapsibleToolbar({});
	}
});

return dojox.editor.plugins.CollapsibleToolbar;

});
