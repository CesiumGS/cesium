dojo.provide("dojox.drawing.ui.dom.Toolbar");
dojo.deprecated("dojox.drawing.ui.dom.Toolbar", "It may not even make it to the 1.4 release.", 1.4);

(function(){
	
	dojo.declare("dojox.drawing.ui.dom.Toolbar", [], {
		// NOTE:
		//			dojox.drawing.Toolbar is DEPRECATED.
		//			The intention never was to use HTML as buttons for a Drawing.
		//			This was implemented in order to finish the project for which
		//			Drawing was developed.
		//			Instead use: drawing/ui/Toolbar.js
		//
		// summary:
		//	Creates a Toolbar to be used with a DojoX Drawing.
		// description:
		//	Currently works in markup only. A class is required with
		//	either horizontal or vertical as a class (IE prevented using
		//	either as a default). Assign an attribute of 'drawingId' with
		//	the id of the DojoX Drawing to which this is assigned.
		//	The node children will be assigned as the Tools in the toolbar.
		//	Plugins can also be assigned.
		//	The Toolbar is largely self contained and has no real public
		//	methods or events. the Drawing object should be used.
		//
		// example:
		//	|	<div dojoType="dojox.drawing.Toolbar" drawingId="drawing" class="drawingToolbar vertical">
		//	|		<div tool="dojox.drawing.tools.Line" 				selected="false">	Line</div>
		//	|		<div tool="dojox.drawing.tools.Rect" 				selected="true">	Rect</div>
		//	|		<div plugin="dojox.drawing.plugins.tools.Zoom" options="{zoomInc:.1,minZoom:.5,maxZoom:2}">Zoom</div>
		//	|	</div>
		//
		// TODO: Toolbar works in markup only. Need programmatic.
		// NOTE: There are plans to make the toolbar out of dojox.gfx vectors.
		//		 This may change the APIs in the future.
		//
		//	baseClass:String
		//		The CSS style to apply to the toolbar node
		baseClass:"drawingToolbar",
		//	buttonClass:String
		//		The CSS style to apply to each button node
		buttonClass:"drawingButton",
		//	iconClass:String
		//		The CSS style to apply to each button icon node
		iconClass:"icon",
		//
		constructor: function(props, node){
			// props is null from markup
			dojo.addOnLoad(this, function(){
				this.domNode = dojo.byId(node);
				dojo.addClass(this.domNode, this.baseClass);
				this.parse();
			});
		},
		
		createIcon: function(/*HTMLNode*/node, /* ? Function*/constr){
			// summary:
			//	Internal. Creates an icon node for each button.
			// arguments:
			//	node: HTMLNode
			//		The button node.
			//	constr: [optional] Function
			//		Optional. If not supplied, an icon is not created.
			//		Information for each icon is derived from
			//		the ToolsSetup object defined at the end
			//		of each tool. See: stencil._Base
			//
			var setup = constr && constr.setup ? constr.setup : {};
			if(setup.iconClass){
				var icon = setup.iconClass ? setup.iconClass : "iconNone";
				var tip = setup.tooltip ? setup.tooltip : "Tool";
				
				var iNode = dojo.create("div", {title:tip}, node);
				dojo.addClass(iNode, this.iconClass);
				dojo.addClass(iNode, icon);
			
				dojo.connect(node, "mouseup", function(evt){
					dojo.stopEvent(evt);
					dojo.removeClass(node, "active");
				});
				dojo.connect(node, "mouseover", function(evt){
					dojo.stopEvent(evt);
					dojo.addClass(node, "hover");
				});
				dojo.connect(node, "mousedown", this, function(evt){
					dojo.stopEvent(evt);
					dojo.addClass(node, "active");
				});
				
				dojo.connect(node, "mouseout", this, function(evt){
					dojo.stopEvent(evt);
					dojo.removeClass(node, "hover");
				});
			}
		},
		
		createTool: function(/*HTMLNode*/node){
			// summary:
			//	Creates a button on the Toolbar that is
			//  a Tool, not a Plugin. Tools draw Stencils,
			//	Plugins do actions.
			// arguments:
			//	node: HTMLNode
			//		The button node.
			//
			node.innerHTML = "";
			var type = dojo.attr(node, "tool");
			this.toolNodes[type] = node;
			dojo.attr(node, "tabIndex", 1);
			var constr = dojo.getObject(type);
			
			this.createIcon(node, constr);
			
			this.drawing.registerTool(type, constr);
			dojo.connect(node, "mouseup", this, function(evt){
				dojo.stopEvent(evt);
				dojo.removeClass(node, "active");
				this.onClick(type);
			});
			dojo.connect(node, "mouseover", function(evt){
				dojo.stopEvent(evt);
				dojo.addClass(node, "hover");
			});
			dojo.connect(node, "mousedown", this, function(evt){
				dojo.stopEvent(evt);
				dojo.addClass(node, "active");
			});
			
			dojo.connect(node, "mouseout", this, function(evt){
				dojo.stopEvent(evt);
				dojo.removeClass(node, "hover");
			});
		},
		
		parse: function(){
			// summary:
			//	Initializing method that reads the dom node and its
			//	children for tools and plugins.
			//
			var drawingId = dojo.attr(this.domNode, "drawingId");
			this.drawing = dojox.drawing.util.common.byId(drawingId);
			!this.drawing && console.error("Drawing not found based on 'drawingId' in Toolbar. ");
			this.toolNodes = {};
			var _sel;
			dojo.query(">", this.domNode).forEach(function(node, i){
				node.className = this.buttonClass;
				var tool = dojo.attr(node, "tool");
				var action = dojo.attr(node, "action");
				var plugin = dojo.attr(node, "plugin");
				if(tool){
					if(i==0 || dojo.attr(node, "selected")=="true"){
						_sel = tool;
					}
					this.createTool(node);
					
				}else if(plugin){
					
					
					
					
					var p = {name:plugin, options:{}},
						opt = dojo.attr(node, "options");
					if(opt){
						p.options = eval("("+opt+")");
					}
					p.options.node = node;
					node.innerHTML = "";
			this.drawing.addPlugin(p);
					
					
					
					
					
					this.createIcon(node, dojo.getObject(dojo.attr(node, "plugin")));
				}
				
			}, this);
			this.drawing.initPlugins();
			dojo.connect(this.drawing, "setTool", this, "onSetTool");
			this.drawing.setTool(_sel);
		},
		onClick: function(/*String*/type){
			// summary:
			//	Event fired from clicking a Tool, not a PLugin.
			//	Plugin clicks are handled within the plugin's class.
			// arguments:
			//	type: Fully qualified name of class. ex:
			//			dojox.drawing.tools.Ellipse
			//
			this.drawing.setTool(type);
		},
		onSetTool: function(/*String*/type){
			// summary:
			// handles buttons clicks and selects or deselects
			for(var n in this.toolNodes){
				if(n == type){
					dojo.addClass(this.toolNodes[type], "selected");
					this.toolNodes[type].blur();
				}else{
					dojo.removeClass(this.toolNodes[n], "selected");
				}
				
			}
		}
	});
	
})();