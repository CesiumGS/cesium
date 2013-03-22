define([
	"dojo",
	"dijit",
	"dojox",
	"dijit/_Widget",
	"dijit/_TemplatedMixin",
	"dijit/_editor/_Plugin",
	"dojo/_base/connect",
	"dojo/_base/declare",
	"dojox/layout/ResizeHandle"
], function(dojo, dijit, dojox, _Widget, _TemplatedMixin, _Plugin) {

dojo.experimental("dojox.editor.plugins.StatusBar");
dojo.declare("dojox.editor.plugins._StatusBar", [_Widget, _TemplatedMixin],{
	// templateString: String
	//		Template for the widget.  Currently using table to get the alignment behavior and
	//		bordering I wanted.  Would prefer not to use table, though.
	templateString: '<div class="dojoxEditorStatusBar">' +
		'<table><tbody><tr>'+
		'<td class="dojoxEditorStatusBarText" tabindex="-1" aria-role="presentation" aria-live="aggressive"><span dojoAttachPoint="barContent">&nbsp;</span></td>' +
		'<td><span dojoAttachPoint="handle"></span></td>' +
		'</tr></tbody><table>'+
	'</div>',

	_getValueAttr: function(){
		// summary:
		//		Over-ride to get the value of the status bar from the widget.
		// tags:
		//		Protected
		return this.barContent.innerHTML;
	},

	_setValueAttr: function(str){
		// summary:
		//		Over-ride to set the value of the status bar from the widget.
		//		If no value is set, it is replaced with a non-blocking space.
		// str: String
		//		The string to set as the status bar content.
		// tags:
		//		protected
		if(str){
			str = dojo.trim(str);
			if(!str){
				str = "&nbsp;";
			}
		}else{
			str = "&nbsp;";
		}
		this.barContent.innerHTML = str;
	}
});

dojo.declare("dojox.editor.plugins.StatusBar", _Plugin, {
	// summary:
	//		This plugin provides StatusBar capability to the editor.
	//		Basically a footer bar where status can be published.  It also
	//		puts a resize handle on the status bar, allowing you to resize the
	//		editor via mouse.

	// statusBar: [protected]
	//		The status bar and resizer.
	statusBar: null,

	// resizer: [public] Boolean
	//		Flag indicating that a resizer should be shown or not.  Default is true.
	//		There are cases (such as using center pane border container to autoresize the editor
	//		That a resizer is not valued.
	resizer: true,

	setEditor: function(editor){
		// summary:
		//		Over-ride for the setting of the editor.
		// editor: Object
		//		The editor to configure for this plugin to use.
		this.editor = editor;
		this.statusBar = new dojox.editor.plugins._StatusBar();
		if(this.resizer){
			this.resizeHandle = new dojox.layout.ResizeHandle({targetId: this.editor, activeResize: true}, this.statusBar.handle);
			this.resizeHandle.startup();
		}else{
			dojo.style(this.statusBar.handle.parentNode, "display", "none");
		}
		var pos = null;
		if(editor.footer.lastChild){
			pos = "after";
		}
		dojo.place(this.statusBar.domNode, editor.footer.lastChild || editor.footer, pos);
		this.statusBar.startup();
		this.editor.statusBar = this;

		// Register a pub-sub event to listen for status bar messages, in addition to being available off
		// the editor as a property 'statusBar'
		this._msgListener = dojo.subscribe(this.editor.id + "_statusBar", dojo.hitch(this, this._setValueAttr));
	},

	_getValueAttr: function(){
		// summary:
		//		Over-ride to get the value of the status bar from the widget.
		// tags:
		//	protected
		return this.statusBar.get("value");
	},

	_setValueAttr: function(str){
		// summary:
		//		Over-ride to set the value of the status bar from the widget.
		//		If no value is set, it is replaced with a non-blocking space.
		// str: String
		//	The String value to set in the bar.
		// tags:
		//		protected
		this.statusBar.set("value", str);
	},

	set: function(attr, val){
		// summary:
		//		Quick and dirty implementation of 'set' pattern
		// attr:
		//		The attribute to set.
		// val:
		//		The value to set it to.
		if(attr){
			var fName = "_set" + attr.charAt(0).toUpperCase() + attr.substring(1, attr.length) + "Attr";
			if(dojo.isFunction(this[fName])){
				this[fName](val);
			}else{
				this[attr] = val;
			}
		}
	},

	get: function(attr){
		// summary:
		//		Quick and dirty implementation of 'get' pattern
		// attr:
		//		The attribute to get.
		if(attr){
			var fName = "_get" + attr.charAt(0).toUpperCase() + attr.substring(1, attr.length) + "Attr";
			var f = this[fName];
			if(dojo.isFunction(f)){
				return this[fName]();
			}else{
				return this[attr];
			}
		}
		return null;
	},

	destroy: function(){
		// summary:
		//		Over-ride to clean up the breadcrumb toolbar.
		if(this.statusBar){
			this.statusBar.destroy();
			delete this.statusBar;
		}
		if(this.resizeHandle){
			this.resizeHandle.destroy();
			delete this.resizeHandle;
		}
		if(this._msgListener){
			dojo.unsubscribe(this._msgListener);
			delete this._msgListener;
		}
		delete this.editor.statusBar;
	}
});

// Register this plugin.
dojo.subscribe(dijit._scopeName + ".Editor.getPlugin",null,function(o){
	if(o.plugin){ return; }
	var name = o.args.name.toLowerCase();
	if(name === "statusbar"){
		var resizer = ("resizer" in o.args)?o.args.resizer:true;
		o.plugin = new dojox.editor.plugins.StatusBar({resizer: resizer});
	}
});

return dojox.editor.plugins.StatusBar;

});
