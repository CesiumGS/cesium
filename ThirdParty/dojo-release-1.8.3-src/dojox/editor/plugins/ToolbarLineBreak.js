define([
	"dojo",
	"dijit",
	"dojox",
	"dijit/_Widget",
	"dijit/_TemplatedMixin",
	"dijit/_editor/_Plugin",
	"dojo/_base/declare"
], function(dojo, dijit, dojox, _Widget, _TemplatedMixin, _Plugin, declare) {

var ToolbarLineBreak = declare("dojox.editor.plugins.ToolbarLineBreak",
	[ _Widget, _TemplatedMixin ],
	{
	// summary:
	//		A 'line break' between two `dijit.Toolbar` items so that very
	//		long toolbars can be organized a bit.
	templateString: "<span class='dijit dijitReset'><br></span>",
	postCreate: function(){
		dojo.setSelectable(this.domNode, false);
	},
	isFocusable: function(){
		// summary:
		//		This widget isn't focusable, so pass along that fact.
		// tags:
		//		protected
		return false;
	}
});


// Register this plugin.
dojo.subscribe(dijit._scopeName + ".Editor.getPlugin",null,function(o){
	if(o.plugin){ return; }
	var name = o.args.name.toLowerCase();
	if(name ===  "||" || name === "toolbarlinebreak"){
		o.plugin = new _Plugin({
			button: new ToolbarLineBreak(),
			setEditor: function(editor){
				this.editor = editor;
			}
		});
	}
});

return ToolbarLineBreak;

});
