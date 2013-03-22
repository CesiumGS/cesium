define(["dojo", "./defaults", "./manager/_registry", "./manager/keys", "./manager/Mouse",
"./manager/Canvas","./manager/Undo","./manager/Anchors","./manager/Stencil","./manager/StencilUI",
  "./util/common"], 
function(dojo, defaults, registry, keys, Mouse, Canvas, Undo, Anchors, Stencil, StencilUI, utilCommon){
	return dojo.declare("dojox.drawing.Drawing", [], {
		// summary:
		//		Drawing is a project that sits on top of DojoX GFX and uses SVG and
		//		VML vector graphics to draw and display.
		// description:
		//		Drawing is similar to DojoX Sketch, but is designed to be more versatile
		//		extendable and customizable.
		//		Drawing currently only initiates from HTML although it's technically not
		//		a Dijit to keep the file size light. But if Dijit is available, Drawing
		//		will register itself with it and can be accessed dijit.byId('myDrawing')
		//
		//		NOTES:
		//		Although not Drawing and Toolbar, all other objects are created with a custom
		//		declare. See dojox.drawing.util.oo
		//
		//		The files are laid out as such:
		//
		//		- Drawing: The master class. More than one instance of a Drawing can be placed
		//			on a page at one time (although this has not yet been tested). Plugins
		//			can be added in markup.
		//		- Toolbar: Like Drawing, Toolbar is a psudeo Dijit that does not need Dijit. It is
		//			optional. It can be oriented horizontal or vertical by placing one of
		//			those params in the class (at least one is required).  Plugins
		//			can be added in markup. A drawingId is required to point toolbar to
		//			the drawing.
		//		- defaults: Contains the default styles and dimensions for Stencils. An individual
		//			Stencil can be changed by calling stencil.att({color obj}); To change
		//			all styles, a custom defaults file should be used.
		//		- Stencils: Drawing uses a concept of 'Stencils' to avoid confusion between a
		//			Dojox Shape and a Drawing Shape. The classes in the 'stencils' package
		//			are display only, they are not used for actually drawing (see 'tools').
		//			This package contains _Base from which stencils inherit most of their
		//			methods. (Path and Image are display only and not found in Tools)
		//		- Tools: The Tools package contains Stencils that are attached to mouse events
		//			and can be used for drawing. Items in this package can also be selected
		//			and modified.
		//		- Tools / Custom: Holds tools that do not directly extend Stencil base classes and often
		//			have very custom code.
		//		- Library (not implemented): The Library package, which is not yet implemented, will be the place to
		//			hold stencils that have very specific data points that result in a picture.
		//			Flag-like-banners, fancy borders, or other complex shapes would go here.
		//		- Annotations: Annotations 'decorate' and attach to other Stencils, such as a 'Label'
		//			that can show text on a stencil, or an 'Angle' that shows while dragging
		//			or modifying a Vector, or an Arrow head that is attached to the beginning
		//			or end of a line.
		//		- Manager: Contains classes that control functionality of a Drawing.
		//		- Plugins: Contains optional classes that are 'plugged into' a Drawing. There are two
		//			types: 'drawing' plugins that modify the canvas, and 'tools' which would
		//			show in the toolbar.
		//		- Util: A collection of common tasks.
		//
		// example:
		//		|	<div dojoType="dojox.drawing.Drawing" id="drawing" defaults="myCustom.defaults"
		//		|		plugins="[{'name':'dojox.drawing.plugins.drawing.Grid', 'options':{gap:100}}]">
		//		|   </div>
		//
		// example:
		//		|	<div dojoType="dojox.drawing.Toolbar" drawingId="drawing" class="drawingToolbar vertical">
		//		|		<div tool="dojox.drawing.tools.Line" selected="false">Line</div>
		//		|		<div tool="dojox.drawing.tools.Rect" selected="false">Rect</div>
		//		|		<div tool="dojox.drawing.tools.Ellipse" selected="false">Ellipse</div>
		//		|		<div tool="dojox.drawing.tools.TextBlock" selected="false">Statement</div>
		//		|		<div tool="dojox.drawing.tools.custom.Equation" selected="false">Equation</div>
		//		|		<div plugin="dojox.drawing.plugins.tools.Pan" options="{}">Pan</div>
		//		|		<div plugin="dojox.drawing.plugins.tools.Zoom" options="{zoomInc:.1,minZoom:.5,maxZoom:2}">Zoom</div>
		//		|	</div>

		// ready: Boolean
		//		Whether or not the canvas has been created and Stencils can be added
		ready:false,

		// mode: [optional] String
		//		Changes the functionality of the drawing
		mode: "",

		// width: Number
		//		Width of the canvas
		width:0,

		// height: Number
		//		Height of the canvas
		height:0,

		// defaults : Object
		//		Optional replacements for native defaults.

		// plugins: Object
		//		Key values of plugins that apply to canvas.

		constructor: function(/* Object */props, /* HTMLNode */node){
			// summary:
			//		Drawing is not a Dijit. This is the master method.
			//
			//		NOTE:
			//		props is always null since this is not a real widget
			//		Will change when Drawing can be created programmatically.

			var def = dojo.attr(node, "defaults");
			this.defaults =  def ? (typeof def === 'string' ? dojo.getObject(def) : def) : defaults;

			this.id = node.id || dijit.getUniqueId('dojox_drawing_Drawing');
			registry.register(this, "drawing");
			this.mode = (props.mode || dojo.attr(node, "mode") || "").toLowerCase();
			var box = dojo.contentBox(node);
			this.width = props.width || box.w;
			this.height = props.height || box.h;
			utilCommon.register(this); // So Toolbar can find this Drawing DEPRECATED
			this.mouse = new Mouse({util:utilCommon, keys:keys, id:this.mode=="ui"?"MUI":"mse"});
			this.mouse.setEventMode(this.mode);

			this.tools = {};
			this.stencilTypes = {};
			this.stencilTypeMap = {};
			this.srcRefNode = node; // need this?
			this.domNode = node;
			if(props.plugins){
				this.plugins = eval(props.plugins);
			}else{
				this.plugins = [];
			}

			this.widgetId = this.id;
			dojo.attr(this.domNode, "widgetId", this.widgetId);
			// If Dijit is available in the page, register with it
			if(dijit && dijit.registry){
				dijit.registry.add(this);
				console.log("using dijit")
			}else{
				// else fake dijit.byId
				// FIXME: This seems pretty hacky.
				// Maybe should just encourage jsId
				dijit.registry = {
					objs:{},
					add:function(obj){
						this.objs[obj.id] = obj;
					}
				};
				dijit.byId = function(id){
					return dijit.registry.objs[id];
				};
				dijit.registry.add(this);
			}

			var stencils = registry.getRegistered("stencil");
			for(var nm in stencils){
				this.registerTool(stencils[nm].name);
			}
			var tools = registry.getRegistered("tool");
			for(nm in tools){
				this.registerTool(tools[nm].name);
			}
			var plugs = registry.getRegistered("plugin");
			for(nm in plugs){
				this.registerTool(plugs[nm].name);
			}
			this._createCanvas();

		},

		_createCanvas: function(){
			console.info("drawing create canvas...");
			this.canvas = new Canvas({
				srcRefNode:this.domNode,
				util:utilCommon,
				mouse:this.mouse,
				width: this.width, height: this.height,
				callback: dojo.hitch(this, "onSurfaceReady")
			});
			this.initPlugins();
		},

		resize: function(/* Object */box){
			// summary:
			//		Resizes the canvas.
			//		If within a ContentPane this will get called automatically.
			//		Can also be called directly.

			box && dojo.style(this.domNode, {
				width:box.w+"px",
				height:box.h+"px"
			});
			if(!this.canvas){
				this._createCanvas();
			}else if(box){
				this.canvas.resize(box.w, box.h);
			}
		},

		startup: function(){
			//console.info("drawing startup")
		},

		getShapeProps: function(/* Object */data, mode){
			// summary:
			//		The common objects that are mixed into
			//		a new Stencil. Mostly internal, but could be used.

			var surface = data.stencilType;
			var ui = this.mode=="ui" || mode=="ui";
			return dojo.mixin({
				container: ui && !surface ? this.canvas.overlay.createGroup() : this.canvas.surface.createGroup(),
				util:utilCommon,
				keys:keys,
				mouse:this.mouse,
				drawing:this,
				drawingType: ui && !surface ? "ui" : "stencil",
				style:this.defaults.copy()
			}, data || {});
		},

		addPlugin: function(/* Object */plugin){
			// summary:
			//		Add a toolbar plugin object to plugins array
			//		to be parsed
			this.plugins.push(plugin);
			if(this.canvas.surfaceReady){
				this.initPlugins();
			}
		},

		initPlugins: function(){
			// summary:
			//		Called from Toolbar after a plugin has been loaded
			//		The call to this coming from toolbar is a bit funky as the timing
			//		of IE for canvas load is different than other browsers
			if(!this.canvas || !this.canvas.surfaceReady){
				var c = dojo.connect(this, "onSurfaceReady", this, function(){
					dojo.disconnect(c);
					this.initPlugins();
				});
				return;
			}
			dojo.forEach(this.plugins, function(p, i){
				var props = dojo.mixin({
					util:utilCommon,
					keys:keys,
					mouse:this.mouse,
					drawing:this,
					stencils:this.stencils,
					anchors:this.anchors,
					canvas:this.canvas
				}, p.options || {});
				//console.log('drawing.plugin:::', p.name, props)
				this.registerTool(p.name, dojo.getObject(p.name));
				try{
					this.plugins[i] = new this.tools[p.name](props);
				}catch(e){
					console.error("Failed to initilaize plugin:	" +p.name + ". Did you require it?");
				}
			}, this);
			this.plugins = [];
			// In IE, because the timing is different we have to get the
			// canvas position after everything has drawn. *sigh*
			this.mouse.setCanvas();
		},

		onSurfaceReady: function(){
			// summary:
			//		Event that to which can be connected.
			//		Fired when the canvas is ready and can be drawn to.

			this.ready = true;
			//console.info("Surface ready")
			this.mouse.init(this.canvas.domNode);
			this.undo = new Undo({keys:keys});
			this.anchors = new Anchors({drawing:this, mouse:this.mouse, undo:this.undo, util:utilCommon});
			if(this.mode == "ui"){
				this.uiStencils = new StencilUI({canvas:this.canvas, surface:this.canvas.surface, mouse:this.mouse, keys:keys});
			}else{
				this.stencils = new Stencil({canvas:this.canvas, surface:this.canvas.surface, mouse:this.mouse, undo:this.undo, keys:keys, anchors:this.anchors});
				this.uiStencils = new StencilUI({canvas:this.canvas, surface:this.canvas.surface, mouse:this.mouse, keys:keys});
			}
			if(dojox.gfx.renderer=="silverlight"){
				try{
				new dojox.drawing.plugins.drawing.Silverlight({util:utilCommon, mouse:this.mouse, stencils:this.stencils, anchors:this.anchors, canvas:this.canvas});
				}catch(e){
					throw new Error("Attempted to install the Silverlight plugin, but it was not found.");
				}
			}
			dojo.forEach(this.plugins, function(p){
				p.onSurfaceReady && p.onSurfaceReady();
			});

		},

		addUI: function(/* String */type, /* Object */options){
			// summary:
			//		Use this method to programmatically add Stencils that display on
			//		the canvas.
			//
			//		FIXME: Currently only supports Stencils that have been registered,
			//		which is items in the toolbar, and the additional Stencils at the
			//		end of onSurfaceReady. This covers all Stencils, but you can't
			//		use 'display only' Stencils for Line, Rect, and Ellipse.
			// type: String
			//		The final name of the tool, lower case: 'image', 'line', 'textBlock'
			// options:
			//		- type: Object
			//
			//		The parameters used to draw the object. See stencil._Base and each
			//		tool for specific parameters of teh data or points objects.

			if(!this.ready){
				var c = dojo.connect(this, "onSurfaceReady", this, function(){
					dojo.disconnect(c);
					this.addUI(type, options);
				});
				return false;
			}
			if(options && !options.data && !options.points){
				options = {data:options}
			}
			if(!this.stencilTypes[type]){
				if(type != "tooltip"){
					console.warn("Not registered:", type);
				}
				return null;
			}
			var s = this.uiStencils.register( new this.stencilTypes[type](this.getShapeProps(options, "ui")));
			return s;
		},


		addStencil: function(/* String */type, /* Object */options){
			// summary:
			//		Use this method to programmatically add Stencils that display on
			//		the canvas.
			//
			//		FIXME: Currently only supports Stencils that have been registered,
			//		which is items in the toolbar, and the additional Stencils at the
			//		end of onSurfaceReady. This covers all Stencils, but you can't
			//		use 'display only' Stencils for Line, Rect, and Ellipse.
			// type: String
			//		The final name of the tool, lower case: 'image', 'line', 'textBlock'
			// options: Object
			//		The parameters used to draw the object. See stencil._Base and each
			//		tool for specific parameters of teh data or points objects.

			if(!this.ready){
				var c = dojo.connect(this, "onSurfaceReady", this, function(){
					dojo.disconnect(c);
					this.addStencil(type, options);
				});
				return false;
			}
			if(options && !options.data && !options.points){
				options = {data:options}
			}
			var s = this.stencils.register( new this.stencilTypes[type](this.getShapeProps(options)));
			// need this or not?
			//s.connect(s, "destroy", this, "onDeleteStencil");
			this.currentStencil && this.currentStencil.moveToFront();
			return s;
		},

		removeStencil: function(/* Object */stencil){
			// summary:
			//		Use this method to programmatically remove Stencils from the canvas.
			// stencil: Object
			//		The Stencil to be removed

			this.stencils.unregister(stencil);
			stencil.destroy();
		},

		removeAll: function(){
			// summary:
			//		Deletes all Stencils on the canvas.
			this.stencils.removeAll();
		},

		selectAll: function(){
			// summary:
			//		Selects all stencils
			this.stencils.selectAll();
		},

		toSelected: function(/*String*/func /*any...*/){
			// summary:
			//		Call a function within all selected Stencils
			//		like attr()
			// example:
			//		|	myDrawing.toSelected('attr', {x:10})

			this.stencils.toSelected.apply(this.stencils, arguments);
		},

		exporter: function(){
			// summary:
			//		Collects all Stencil data and returns an
			//		Array of objects.
			console.log("this.stencils", this.stencils);
			return this.stencils.exporter();  //Array
		},

		importer: function(/* Array */objects){
			// summary:
			//		Handles an Array of stencil data and imports the objects
			//		to the drawing.
			dojo.forEach(objects, function(m){
				this.addStencil(m.type, m);
			}, this);
		},

		changeDefaults: function(/*Object*/newStyle,/*Boolean*/value){
			// summary:
			//		Change the defaults so that all Stencils from this
			//		point on will use the newly changed style.
			// newStyle: Object
			//		An object that represents one of the objects in
			//		drawing.style that will be mixed in. Not all
			//		properties are necessary. Only one object may
			//		be changed at a time. The object boolean parameter
			//		is not required and if not set objects will automatically
			//		be changed.
			//		Changing non-objects like angleSnap requires value
			//		to be true.
			// example:
			//		|	myDrawing.changeDefaults({
			//		|		norm:{
			//		|			fill:"#0000ff",
			//		|			width:5,
			//		|			color:"#ffff00"
			//		|		}
			//		|	});

			//console.log("----->>> changeDefault: ",newStyle, " value?: ",value);
			if(value!=undefined && value){
				for(var nm in newStyle){
					this.defaults[nm] = newStyle[nm];
				}
			}else{
				for(var nm in newStyle){
					for(var n in newStyle[nm]){
						//console.log("  copy", nm, n, " to: ", newStyle[nm][n]);
						this.defaults[nm][n] = newStyle[nm][n];
					}
				}
			}

			if(this.currentStencil!=undefined && (!this.currentStencil.created || this.defaults.clickMode)){
				this.unSetTool();
				this.setTool(this.currentType);
			}
		},

		onRenderStencil: function(/* Object */stencil){
			// summary:
			//		Event that fires when a stencil is drawn. Does not fire from
			//		'addStencil'.

			//console.info("--------------------------------------dojox.drawing.onRenderStencil:", stencil.id);

			this.stencils.register(stencil);
			this.unSetTool();
			if(!this.defaults.clickMode){
				this.setTool(this.currentType);
			}else{
				this.defaults.clickable = true;
			}
		},

		onDeleteStencil: function(/* Object */stencil){
			// summary:
			//		Event fired from a stencil that has destroyed itself
			//	 	will also be called when it is removed by "removeStencil"
			//	 	or stencils.onDelete.

			this.stencils.unregister(stencil);
		},

		registerTool: function(/* String */type){
			// summary:
			//		 Registers a tool that can be accessed. Internal.
			if(this.tools[type]){ return; }
			var constr = dojo.getObject(type);
			//console.log("constr:", type)
			this.tools[type] = constr;
			var abbr = utilCommon.abbr(type);
			this.stencilTypes[abbr] = constr;
			this.stencilTypeMap[abbr] = type;
		},

		getConstructor: function(/*String*/abbr){
			// summary:
			//		Returns a Stencil constructor base on
			//		abbreviation
			return this.stencilTypes[abbr];
		},

		setTool: function(/* String */type){
			// summary:
			//		Sets up a new class to be used to draw. Called from Toolbar,
			//		and this class... after a tool is used a new one of the same
			//		type is initialized. Could be called externally.

			if(this.mode=="ui"){ return; }
			if(!this.canvas || !this.canvas.surface){
				var c = dojo.connect(this, "onSurfaceReady", this, function(){
					dojo.disconnect(c);
					this.setTool(type);
				});
				return;
			}
			if(this.currentStencil){
				this.unSetTool();
			}

			this.currentType = this.tools[type] ? type : this.stencilTypeMap[type];
			//console.log("new tool arg:", type, "curr:", this.currentType, "mode:", this.mode, "tools:", this.tools)

			try{
				this.currentStencil = new this.tools[this.currentType]({container:this.canvas.surface.createGroup(), util:utilCommon, mouse:this.mouse, keys:keys});
				console.log("new tool is:", this.currentStencil.id, this.currentStencil);
				if(this.defaults.clickMode){ this.defaults.clickable = false; }
				this.currentStencil.connect(this.currentStencil, "onRender", this, "onRenderStencil");
				this.currentStencil.connect(this.currentStencil, "destroy", this, "onDeleteStencil");
			}catch(e){
				console.error("dojox.drawing.setTool Error:", e);
				console.error(this.currentType + " is not a constructor: ", this.tools[this.currentType]);
				//console.trace();
			}
		},

		set: function(name, value){
			// summary:
			//		Drawing registers as a widget and needs to support
			//		widget's api.
			console.info("Attempting to set ",name," to: ",value,". Set currently not fully supported in Drawing");
		},

		get: function(name){
			return;
		},

		unSetTool: function(){
			// summary:
			//		Destroys current tool
			if(!this.currentStencil.created){
				this.currentStencil.destroy();
			}

		}
	});

});
