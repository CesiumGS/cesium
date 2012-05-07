dojo.provide("dojox.drawing.stencil._Base");
dojo.require("dojo.fx.easing");

/*=====
StencilArgs = {
//	container: [readonly] dojo.gfx.group
//		The parent shape that contains all
//		shapes used in a Stencil
container:null,
//
//	anchorType: String
//		Optionally blank or 'group'. 'group' tells
//		an anchor point that it must constrain
//		itself to other anchor points.
anchorType:"",
//
// 	isText: Boolean
//		Whether this is a text object or not
//		(either stencil.text or tools.TextBlock)
isText:false,
//
// 	shortType: String
//		The type of stencil that corresponds with the types and
//		constructors used in Drawing.registerTool
shortType:"",
//
//	annotation: Boolean
//		A Stencil used within a Stencil. An annotation
//		is not selectable or clickable. A Label would
//		be one example.
annotation:false,
//
//	subShape: Boolean
//		A Stencil used within a Stencil. A subShape
//		is clickable. An arrow head would be an example.
subShape:false,
//
//	style: Object
//		An instance of the styles and defaults used within
//		the Stencil.
style:null,
//
//	util: Object
//		Pointer to util.common
util:null,
//
//	mouse: Object
//		Pointer to the mouse instance
mouse:null,
//
//	keys: Object
//		Pointer to the keys class
keys:null,
//
//	points: StencilPoints
//		Points is an array of objects that make up the
//		description of a Stencil. The points to a Rect
//		that is 100x100 and at x:10 and y:10 would look like:
//		[{x:10,y:10}, {x:110, y:10}, {x:110, y:110}, {x:10, y:110}]
//		Points go clockwise from the top left. In the case of Paths,
//		they would go in the order that the Stencil would be drawn.
//		Always when the points Array is set, a data Object is created
//		as well. So never set points directly, always use setPoints().
//	See:
//		setPoints()
points:[],
//
//	data: StencilData
//		A data object typically (but not always) resembles the data
//		that is used to create the dojox.gfx Shape. The same Rect
//		example shown in points above would look like:
//		{x:10, y:10, width:100, height:100}
//		And an Ellipse with the same coordinates:
//		{cx:55, cy:55, rx:50, ry:50}
//		The only Stencil that does not support data (at this time)
//		is the Path. While x1,x2,x3... culd be used in a data object
//		it doesn't provide much benefit.
//		Always when a data object is set, a set of points is created
//		as well. So never set data directly, always use setData().
//	See:
//		setData()
data:null,
//
// 	marginZero [readonly] Number
// 		How closely shape can get to y:0 or x:0. Less than zero has
//		bugs in VML. This is set with defaults, and should be equal
//		to half the size of an anchor point (5 px)
marginZero:0,
//
//	created [readonly] Boolean
//		Whether the Stencil has been rendered for the first time or
//		not.
created: false,
//
//	highlighted [readonly] Boolean
//		Whether the Stencil is highlighted or not.
highlighted:false,
//
//	selected [readonly] Boolean
//		Whether the Stencil is selected or not.
selected:false,
//
//	draws [readonly] Boolean
//		Whether the Stencil can draw with a mouse drag or can just
//		be created programmtically. If the Stencil comes from the
//		stencil package, it should be draw:false. If it comes from
//		the tools package it should be draw:true.
draws:false
}

StencilPoint = {
// summary:
//	One point Object in the points Array
//	x: Number
//		x position of point
//	y: Number
//		y position of point
}

ToolsSetup = {
// summary:
//	An object attached to a Tool's constructor
//	used to inform the toolbar of its information
//	and properties.
// description:
//	This object is inserted into the *function* of
//	a tool (not a stencil). Like: function.ToolsSetup
//	It must be attached after constructr creation, so
//	this object is found at the botton of the file.
//
//	name:String
//		Fully qualified name of constructor
//	tooltip: Stirng
//		Text to display on toolbar button hover
//	iconClass: String
//		CSS class with icon information to attach
//		to toolbar button.
}
=====*/

dojox.drawing.stencil._Base = dojox.drawing.util.oo.declare(
	// summary:
	//		The base class used for all Stencils.
	// description:
	//		All stencils extend this base class.
	//		Most methods and events can be found here.
	//
	function(options){
		//console.log("______Base", this.type, options)
		// clone style so changes are reflected in future shapes
		dojo.mixin(this, options);
		this.style = options.style || dojox.drawing.defaults.copy();
		if(options.stencil){
			this.stencil = options.stencil;
			this.util = options.stencil.util;
			this.mouse = options.stencil.mouse;
			this.container = options.stencil.container;
			this.style = options.stencil.style;
		}

		// don't use the 'g' on these, it affects
		// the global RegExp
		var lineTypes = /Line|Vector|Axes|Arrow/;
		var textTypes = /Text/;

		this.shortType = this.util.abbr(this.type);
		this.isText = textTypes.test(this.type);
		this.isLine = lineTypes.test(this.type);

		this.renderHit = this.style.renderHitLayer;
		if(!this.renderHit && this.style.renderHitLines && this.isLine){
			this.renderHit = true;
		}
		if(!this.renderHit && this.style.useSelectedStyle){
			this.useSelectedStyle = true;
			this.selCopy = dojo.clone(this.style.selected);
			for(var nm in this.style.norm){
				if(this.style.selected[nm]===undefined){
					this.style.selected[nm] = this.style.norm[nm];
				}
			}
			this.textSelected = dojo.clone(this.style.text);
			this.textSelected.color = this.style.selected.fill;

		}


		this.angleSnap = this.style.angleSnap || 1;

		this.marginZero = options.marginZero || this.style.anchors.marginZero;
		this.id = options.id || this.util.uid(this.type);
		this._cons = [];

		if(!this.annotation && !this.subShape){
			this.util.attr(this.container, "id", this.id);
		}

		this.connect(this, "onBeforeRender", "preventNegativePos");

		this._offX = this.mouse.origin.x;
		this._offY = this.mouse.origin.y;

		if(this.isText){
			this.align = options.align || this.align;
			this.valign = options.valign || this.valign;
			if(options.data && options.data.makeFit){
				var textObj = this.makeFit(options.data.text, options.data.width);
				this.textSize = this.style.text.size = textObj.size;
				this._lineHeight = textObj.box.h;
			}else{
				this.textSize = parseInt(this.style.text.size, 10);
				this._lineHeight = this.textSize * 1.4;
			}


			// TODO: thinner text selection
			//this.style.hitSelected.width *= 0.5;
			//
			// ouch. how verbose. My mixin is weak....
			this.deleteEmptyCreate = options.deleteEmptyCreate!==undefined ? options.deleteEmptyCreate : this.style.text.deleteEmptyCreate;
			this.deleteEmptyModify = options.deleteEmptyModify!==undefined ? options.deleteEmptyModify : this.style.text.deleteEmptyModify;
		}

		//this.drawingType

		this.attr(options.data);

		// make truthy
		// add to renders below
		// this.baseRender && render()
		//if(this.type == "dojox.drawing.tools.TextBlock"){
		if(this.noBaseRender){
			// TextBlock will handle rendering itself
			return;
		}

		//console.log("BASE OPTS:", options)
		if(options.points){
			//console.log("__________Base.constr >>>> ", this.type, "points", options.points)
			if(options.data && options.data.closePath===false){
				this.closePath = false;
			}
			this.setPoints(options.points);
			this.connect(this, "render", this, "onRender", true);
			this.baseRender && this.enabled && this.render();
			options.label && this.setLabel(options.label);
			options.shadow && this.addShadow(options.shadow);

		}else if(options.data){
			//console.log("___________Base.constr", this.type, "options data", options.data)
			options.data.width = options.data.width ? options.data.width : this.style.text.minWidth;
			options.data.height = options.data.height ? options.data.height : this._lineHeight;
			this.setData(options.data);
			this.connect(this, "render", this, "onRender", true);
			this.baseRender && this.enabled && this.render(options.data.text);
			this.baseRender && options.label && this.setLabel(options.label);
			this.baseRender && options.shadow && this.addShadow(options.shadow);

		}else if(this.draws){
			//console.log("_____________Base.constr", this.type, "draws")
			this.points = [];
			this.data = {};
			this.connectMouse();
			this._postRenderCon = dojo.connect(this, "render", this, "_onPostRender");
		}
		if(this.showAngle){
			this.angleLabel = new dojox.drawing.annotations.Angle({stencil:this});
		}

		if(!this.enabled){
			this.disable();
			this.moveToBack();
			// some things render some don't...
			this.render(options.data.text);
		}

	},
	{

		// type: String
		//		The type of Stencil this is. Should be overridden
		//		by extending classes.
		//	FIXME: should this be declaredClass?
		type:"dojox.drawing.stencil",
		//
		//	minimumSize: Number
		//		The minimum size allowed for a render. If the size
		//		is less, the shape is destroyed.
		minimumSize:10,
		//
		//	enabled [readonly] Boolean
		//		Whether the Stencil is enabled or not.
		enabled:true,


		drawingType:"stencil",

		//points:[],

		setData: function(/*StencilData*/data){
			// summary:
			//		Setter for Stencil data; also converts
			//		data to points. See individual Stencils
			//		for specific data properties.
			this.data = data;
			this.points = this.dataToPoints();
		},

		setPoints: function(/*StencilPoints*/points){
			// summary:
			//		Setter for Stencil points; also converts
			//		points to data. See individual Stencils
			//		for specific points properties.
			this.points = points;
			// Path doesn't do data
			if(this.pointsToData){
				this.data = this.pointsToData();
			}
		},

		onDelete: function(/* Stencil */ stencil){
			// summary:
			//		Stub - fires before this is destroyed
			console.info("onDelete", this.id);
		},

		onBeforeRender: function(/*Object*/ stencil){
			// summary:
			//		Stub - Fires before render occurs.
		},

		onModify: function(/*Object*/stencil){
			// summary:
			//		Stub - fires on change of any property,
			// including style properties

		},

		onChangeData: function(/*Object*/ stencil){
			// summary:
			//		Stub - fires on change of dimensional
			//	properties or a text change
		},

		onChangeText: function(value){ // value or 'this' ?
			// summary:
			//		Stub - fires on change of text in a
			//	TextBlock tool only
		},

		onRender: function(/*Object*/ stencil){
			// summary:
			//		Stub - Fires on creation.
			// 		Drawing connects to this (once!) to be
			// 		notified of drag completion. But only if it
			//		was registered as a Tool. Creating Stencil in and of
			// 		itself does not register it.
			//
			// 		This should fire
			// 		at the *end* of creation (not during drag)
			//
			//	FIXME:
			//		This should probably be onCreate. It should
			//		only fire once. But the mechanism for determining
			//		this is more complicated than it sounds.
			//
			this._postRenderCon = dojo.connect(this, "render", this, "_onPostRender");
			this.created = true;
			this.disconnectMouse();

			// for Silverlight
			if(this.shape){
				this.shape.superClass = this;
			}else{
				this.container.superClass = this;
			}
			this._setNodeAtts(this);
			//console.warn("ONRENDER", this.id, this)
		},

		onChangeStyle: function(/*Object*/stencil){
			// summary:
			//		Fires when styles of shape has changed
			//
			this._isBeingModified = true; // need this to prevent onRender
			if(!this.enabled){
				this.style.current = this.style.disabled;
				this.style.currentText = this.style.textDisabled;
				this.style.currentHit = this.style.hitNorm;

			}else{
				this.style.current = this.style.norm;
				this.style.currentHit = this.style.hitNorm;
				this.style.currentText = this.style.text;
			}

			if(this.selected){
				if(this.useSelectedStyle){
					this.style.current = this.style.selected;
					this.style.currentText = this.textSelected;
				}
				this.style.currentHit = this.style.hitSelected;

			}else if(this.highlighted){
				//this.style.current = this.style.highlighted;
				this.style.currentHit = this.style.hitHighlighted;
				//this.style.currentText = this.style.textHighlighted;
			}

			// NOTE: Can't just change props like setStroke
			//	because Silverlight throws error
			this.render();
		},

		animate: function(options, create){
			console.warn("ANIMATE..........................")
			var d = 	options.d || options.duration || 1000;
			var ms = 	options.ms || 20;
			var ease = 	options.ease || dojo.fx.easing.linear;
			var steps = options.steps;
			var ts = 	new Date().getTime();
			var w = 	100;
			var cnt = 	0;
			var isArray = true;
			var sp, ep;

			if(dojo.isArray(options.start)){
				sp =	options.start;
				ep = 	options.end;

			}else if(dojo.isObject(options.start)){
				sp =	options.start;
				ep = 	options.end;
				isArray = 	false;
			}else{

				console.warn("No data provided to animate")
			}

			var v = setInterval(dojo.hitch(this, function(){
				var t = new Date().getTime() - ts;
				var p = ease(1-t/d);
				if(t > d || cnt++ > 100){
					clearInterval(v);
					return;
				}

				if(isArray){
					var pnts = [];
					dojo.forEach(sp, function(pt, i){

						var o = {
							x: (ep[i].x-sp[i].x)*p + sp[i].x,
							y: (ep[i].y-sp[i].y)*p + sp[i].y
						};
						pnts.push(o);
					});
					this.setPoints(pnts);
					this.render();

				}else{

					var o = {};
					for(var nm in sp){
						o[nm] = (ep[nm] - sp[nm]) * p + sp[nm];
					}

					this.attr(o);

				}
				//console.dir(pnts)


				//this.attr("height", w);
				////console.log("W:", w)
				//w += 5;

			}), ms);
		},

		attr: function(/*String | Object*/key, /* ? String | Number */value){
			// summary
			//		Changes properties in the style or disabled styles,
			//		depending on whether the object is enabled.
			//		Also can be used to change most position and size props.

			// NOTE: JUST A SETTTER!! TODO!

			// WARNING:
			//	Not doing any Stencil-type checking here. Setting a height
			//	on a line or an angle on a rectangle will just not render.

			// FIXME
			// 'width' attr is used for line width. How to change the width of a stencil?
			var n = this.enabled?this.style.norm:this.style.disabled;
			var t = this.enabled?this.style.text:this.style.textDisabled;
			var ts = this.textSelected || {},
				o,
				nm,
				width,
				styleWas = dojo.toJson(n),
				textWas = dojo.toJson(t);

			var coords = {
				x:true,
				y:true,
				r:true,
				height:true,
				width:true,
				radius:true,
				angle:true
			};
			var propChange = false;
			if(typeof(key)!="object"){
				o = {};
				o[key] = value;
			}else{
				// prevent changing actual data
				o = dojo.clone(key);
			}

			if(o.width){
				// using width for size,
				// borderWidth should be used
				// for line thickness
				width = o.width;
				delete o.width;
			}

			for(nm in o){
				if(nm in n){ n[nm] = o[nm]; }
				if(nm in t){ t[nm] = o[nm]; }
				if(nm in ts){ ts[nm] = o[nm]; }

				if(nm in coords){
					coords[nm] = o[nm];
					propChange = true;
					if(nm == "radius" && o.angle===undefined){
						o.angle = coords.angle = this.getAngle();
					}else if(nm == "angle" && o.radius===undefined){
						o.radius = coords.radius = this.getRadius();
					}

				}
				if(nm == "text"){
					this.setText(o.text);
				}
				if(nm == "label"){
					this.setLabel(o.label);
				}
			}
			if(o.borderWidth!==undefined){
				n.width = o.borderWidth;
			}
			
			if(this.useSelectedStyle){
				// using the orginal selected style copy as
				// a reference map of what props to copy
				for(nm in this.style.norm){
					if(this.selCopy[nm]===undefined){
						this.style.selected[nm] = this.style.norm[nm];
					}
				}
				this.textSelected.color = this.style.selected.color;

			}

			if(!this.created){
				return;
			}

			// basic transform
			if(o.x!==undefined || o.y!==undefined){
				var box = this.getBounds(true);
				var mx = { dx:0, dy:0 };
				for(nm in o){
					if(nm=="x" || nm =="y" || nm =="r"){
						mx["d"+nm] = o[nm] - box[nm];
					}
				}
				this.transformPoints(mx);
			}


			var p = this.points;
			if(o.angle!==undefined){
				this.dataToPoints({
					x:this.data.x1,
					y:this.data.y1,
					angle:o.angle,
					radius:o.radius
				});

			} else if(width!==undefined){
				p[1].x = p[2].x = p[0].x + width;
				this.pointsToData(p);
			}

			if(o.height!==undefined && o.angle===undefined){
			console.log("Doing P2D-2");
				p[2].y = p[3].y = p[0].y + o.height;
				this.pointsToData(p);
			}

			if(o.r!==undefined){
				this.data.r = Math.max(0, o.r);
			}

			//console.dir(this.data);
			if(propChange || textWas!=dojo.toJson(t) || styleWas != dojo.toJson(n)){
				// to trigger the render
				// other events will be called post render
				this.onChangeStyle(this);
			}
			o.width = width;
			
			if(o.cosphi!=undefined){
				!this.data? this.data = {cosphi:o.cosphi} : this.data.cosphi = o.cosphi;
				this.style.zAxis = o.cosphi!=0 ? true : false;
			}
		},

		exporter: function(){
			// summary:
			//		Exports Stencil data
			//
			var type = this.type.substring(this.type.lastIndexOf(".")+1).charAt(0).toLowerCase()
				+ this.type.substring(this.type.lastIndexOf(".")+2);
			var o = dojo.clone(this.style.norm);
			o.borderWidth = o.width;
			delete o.width;
			if(type=="path"){
				o.points = this.points;
			}else{
				o = dojo.mixin(o, this.data);
			}
			o.type = type;
			if(this.isText){
				o.text = this.getText();
				o = dojo.mixin(o, this.style.text);
				delete o.minWidth;
				delete o.deleteEmptyCreate;
				delete o.deleteEmptyModify;
			}
			var lbl = this.getLabel();
			if(lbl){
				o.label = lbl;
			}
			return o;
		},


		//	TODO:
		// 		Makes these all called by att()
		//		Should points and data be?
		//
		disable: function(){
			// summary:
			//		Disables Stencil so it is not selectable.
			//		Changes the color to the disabled style.
			this.enabled = false;
			this.renderHit = false;
			this.onChangeStyle(this);
		},

		enable: function(){
			// summary:
			//		Enables Stencil so it is not selectable (if
			//		it was selectable to begin with). Changes the
			//		color to the current style.
			this.enabled = true;
			this.renderHit = true;
			this.onChangeStyle(this);
		},

		select: function(){
			// summary:
			//		Called when the Stencil is selected.
			//		NOTE: Calling this will not select the Stencil
			//		calling this just sets the style to the 'selected'
			//		theme. 'manager.Stencil' should be used for selecting
			//		Stencils.
			//
			this.selected = true;
			this.onChangeStyle(this);
		},

		deselect: function(/*Boolean*/useDelay){
			// summary:
			//		Called when the Stencil is deselected.
			//		NOTE: Calling this will not deselect the Stencil
			//		calling this just sets the style to the current
			//		theme. 'manager.Stencil' should be used for selecting
			//		and deselecting Stencils.
			//
			//	arguments:
			//		useDelay: Boolean
			//			Adds  slight delay before the style is set.
			//
			// should not have to render here because the deselection
			// re-renders after the transform
			// but... oh well.
			if(useDelay){
				setTimeout(dojo.hitch(this, function(){
					this.selected = false;
					this.onChangeStyle(this);
				}),200);
			}else{
				this.selected = false;
				this.onChangeStyle(this);
			}
		},
		_toggleSelected: function(){
			if(!this.selected){ return; }
			this.deselect();
			setTimeout(dojo.hitch(this, "select"), 0);
		},

		highlight: function(){
			// summary:
			//		Changes style to the highlight theme.
			this.highlighted = true;
			this.onChangeStyle(this);
		},

		unhighlight: function(){
			// summary:
			//		Changes style to the current theme.
			this.highlighted = false;
			this.onChangeStyle(this);
		},

		moveToFront: function(){
			// summary:
			//		Moves Stencil to the front of all other items
			//		on the canvas.
			this.container && this.container.moveToFront();
		},

		moveToBack: function(){
			// summary:
			//		Moves Stencil to the back of all other items
			//		on the canvas.
			this.container && this.container.moveToBack();
		},

		onTransformBegin: function(/* ? manager.Anchor */anchor){
			// summary:
			//		Fired at the start of a transform. This would be
			//		an anchor drag or a selection.
			//
			this._isBeingModified = true;
		},

		onTransformEnd: function(/* manager.Anchor */anchor){
			// summary:
			// 		Called from anchor point up mouse up
			this._isBeingModified = false;
			this.onModify(this);
		},

		onTransform: function(/* ? manager.Anchor */anchor){
			// summary:
			// 		Called from anchor point mouse drag
			// 		also called from plugins.Pan.checkBounds
			if(!this._isBeingModified){
				this.onTransformBegin();
			}
			// this is not needed for anchor moves, but it
			// is for stencil move:
			this.setPoints(this.points);
			this.render();
		},

		transformPoints: function(mx){
			// summary:
			//		Moves object to a new X Y location
			//		mx is additive. So mx.dx=1 will move the stencil
			//		1 pixel to the right from wherever it was.
			//
			// An attempt is made to prevent < 0 errors, but
			// this won't work on all shapes (like Axes)
			//
			if(!mx.dx && !mx.dy){
				// no change
				return;
			}
			var backup = dojo.clone(this.points), abort = false;
			dojo.forEach(this.points, function(o){
				o.x += mx.dx;
				o.y += mx.dy;
				if(o.x<this.marginZero || o.y<this.marginZero){
					abort = true;
				}
			});
			if(abort){
				this.points = backup;
				console.error("Attempt to set object '"+this.id+"' to less than zero.");
				return;
			}
			this.onTransform();
			this.onTransformEnd();
		},

		applyTransform: function(mx){
			// summary:
			//		Applies the transform to the stencil
			//		NOTE: PARTIALLY IMPLEMENTED
			//			Only applies x y coords
			this.transformPoints(mx);
		},

		setTransform: function(/*Object*/mx){
			// summary:
			//		Sets the transform to the stencil
			//		NOTE: PARTIALLY IMPLEMENTED
			//			Only applies x y coords
			this.attr({
				x:mx.dx,
				y:mx.dy
			});
		},

		getTransform: function(){
			// summary:
			//		Returns the current transform (position) of the Stencil's
			//		container
			return this.selected ? this.container.getParent().getTransform() : {dx:0, dy:0}; // Object
		},

		addShadow: function(/*Object*/args){
			args = args===true ? {} : args;
			args.stencil = this;
			this.shadow = new dojox.drawing.annotations.BoxShadow(args);
		},

		removeShadow: function(){
			this.shadow.destroy();
		},

		setLabel: function(/*String*/text){
			// summary:
			//		Creates and sets a label annotation for the Stencil.
			//		If Stencil contains a labelPosition method, that will
			//		be used for positioning. Otherwise
			//		dojox.drawing.util.positioning.label is used.
			// arguments:
			//		text: String
			//			The text to set as the label.
			//
			if(!this._label){
				this._label = new dojox.drawing.annotations.Label({
					text:text,
					util:this.util,
					mouse:this.mouse,
					stencil:this,
					annotation:true,
					container:this.container,
					labelPosition:this.labelPosition
				});
			}else if(text!=undefined){
				this._label.setLabel(text);
			}
		},
		
		getLabel: function(){
			// summary:
			//		Get the text of the label.
			//
			if(this._label){
				return this._label.getText(); // String
			}
			return null; //null
		},

		getAngle: function(){
			// summary:
			//		Gets angle of Stencil
			// NOTE: Only works for Lines, Arrows, Vectors and Axes
			//		(works on points, not transforms)
			var d = this.pointsToData();
			var obj = {
				start:{
					x:d.x1,
					y:d.y1
				},
				x:d.x2,
				y:d.y2
			};
			var angle = this.util.angle(obj, this.angleSnap);
			// converting the angle for display: -180 -> 180, -90 -> 270
			angle<0 ? angle = 360 + angle : angle;
			return angle;
		},
		getRadius: function(){
			// summary:
			//		Gets radius (length) of Stencil
			// NOTE: Only works for Lines, Arrows and Vectors
			//	(not for Ellipse, Axes has its own version)
			//
			var box = this.getBounds(true);
			var line = {start:{x:box.x1, y:box.y1}, x:box.x2, y:box.y2};
			return this.util.length(line);
		},
		getBounds: function(/* ? Boolean*/absolute){
			// summary:
			//		Returns the coordinates of the Stencil. This is often
			//		different than the data or the points.
			//		arguments:
			//			absolute: Boolean
			//				Keeps lines from flipping (see note).
			//
			// NOTE: Won't work for paths or annotations (labels, Axes, arrow tips)
			//		They should overwrite.
			// NOTE: Primarily used for checking for if shape is off
			//		canvas. Therefore Lines could get flipped. Use absolute
			//		to prevent this.
			//
			var p = this.points, x1, y1, x2, y2;
			if(p.length==2){
				if(absolute){
					x1 = p[0].x;
					y1 = p[0].y;
					x2 = p[1].x;
					y2 = p[1].y
				}else{
					x1 = p[0].x < p[1].x ? p[0].x : p[1].x;
					y1 = p[0].y < p[1].y ? p[0].y : p[1].y;
					x2 = p[0].x < p[1].x ? p[1].x : p[0].x;
					y2 = p[0].y < p[1].y ? p[1].y : p[0].y;
				}
				return {
					x1:x1,
					y1:y1,
					x2:x2,
					y2:y2,
					x:x1,
					y:y1,
					w:x2-x1,
					h:y2-y1
				}; // Object
			}else{
				return {
					x1:p[0].x,
					y1:p[0].y,
					x2:p[2].x,
					y2:p[2].y,
					x:p[0].x,
					y:p[0].y,
					w:p[2].x - p[0].x,
					h:p[2].y - p[0].y
				}; // Object
			}
		},


		preventNegativePos: function(){
			// summary:
			//		Internal. Prevent item from being drawn/rendered less
			//		than zero on the X or Y.
			//
			// if being modified anchors will prevent less than zero.
			if(this._isBeingModified){ return; }
			// FIXME: why is this sometimes empty?
			if(!this.points || !this.points.length){ return; }

			if(this.type=="dojox.drawing.tools.custom.Axes"){
				// this scenario moves all points if < 0
				var minY = this.marginZero, minX = this.marginZero;
				dojo.forEach(this.points, function(p){ minY = Math.min(p.y, minY); });
				dojo.forEach(this.points, function(p){ minX = Math.min(p.x, minX); });

				if(minY<this.marginZero){
					dojo.forEach(this.points, function(p, i){
						p.y = p.y + (this.marginZero-minY)
					}, this);
				}
				if(minX<this.marginZero){
					dojo.forEach(this.points, function(p){
						p.x += (this.marginZero-minX)
					}, this);
				}

			}else{
				// this scenario moves just the one point that is < 0
				dojo.forEach(this.points, function(p){
					p.x = p.x < 0 ? this.marginZero : p.x;
					p.y = p.y < 0 ? this.marginZero : p.y;
				});
			}
			this.setPoints(this.points);
		},

		_onPostRender: function(/*Object*/data){
			// summary:
			//		Drag-create or programmatic create calls onRender
			//		and afterwards, _onPostRender is called and
			//		manages further events.
			//
			// TODO: can this be onModify? Is that more clear?
			//
			//console.info("...........post render.....");

			if(this._isBeingModified){
				this.onModify(this);
				this._isBeingModified = false;
			}else if(!this.created){
				//this.onCreate(this);
				//this.onRender(this);
			}

			if(!this.editMode && !this.selected && this._prevData && dojo.toJson(this._prevData) != dojo.toJson(this.data)){
				//console.info("_Base data changed ----> : this.editMode:", this.editMode)
				this.onChangeData(this);
				this._prevData = dojo.clone(this.data);

			}else if(!this._prevData && (!this.isText || this.getText())){
				//console.info("_Base no prevData..........................");
				this._prevData = dojo.clone(this.data);

			}

		},

		_setNodeAtts: function(shape){
			// summary:
			//		Internal. Sets the rawNode attribute. (Or in Silverlight
			//		an "object attribute". "stencil" is
			// 		used by the application to determine if
			//		something is selectable or not. This also
			//		sets the mouse custom events like:
			//		"onStencilUp". To disable the selectability,
			//		make the att "", which causes a standard
			//		mouse event.
			//		Labels are special and used to select master stencils.
			var att = this.enabled && (!this.annotation || this.drawingType=="label") ? this.drawingType : "";
			this.util.attr(shape, "drawingType", att);
		},


		destroy: function(){
			// summary:
			//		Destroys this Stencil
			// Note:
			//		Can connect to this, but it's better to
			//		connect to onDelete
			//
			// prevent loops:
			if(this.destroyed){ return; }
			if(this.data || this.points && this.points.length){
				this.onDelete(this);
			}

			this.disconnectMouse();
			this.disconnect(this._cons);
			dojo.disconnect(this._postRenderCon);
			this.remove(this.shape, this.hit);
			this.destroyed = true;
		},

		remove: function(/*Shape...*/){
			// summary:
			//		Removes shape(s), typically before a re-render
			// 		No args defaults to this.shape
			//		Pass in multiple args to remove multiple shapes
			//
			// FIXME: Use an Array of all shapes
			//
			var a = arguments;
			if(!a.length){
				if(!this.shape){ return; }
				a = [this.shape];
			}
			for(var i=0;i<a.length;i++){
				if(a[i]){
					a[i].removeShape();
				}
			}
		},

		connectMult: function(/*dojo.connect args */){
			// summary:
			//		Convenience method for batches of quick connects
			// 		Handles are not returned and therefore cannot be
			//		disconnected until Shape destroy time
			//
			if(arguments.length>1){
				// arguments are the connect params
				this._cons.push(this.connect.apply(this, arguments));
			}else if(dojo.isArray(arguments[0][0])){
				// an array of arrays of params
				dojo.forEach(arguments[0], function(ar){
					this._cons.push(this.connect.apply(this, ar));
				}, this);
			}else{
				//one array of params
				this._cons.push(this.connect.apply(this, arguments[0]));
			}

		},

		// TODO: connect to a Shape event from outside class
		connect: function(o, e, s, m, /* Boolean*/once){
			// summary:
			//		Convenience method for quick connects
			//		See comments below for possiblities
			//		functions can be strings
			// once:
			//		If true, the connection happens only
			//		once then disconnects. Five args are required
			//		for this functionality.
			//
			var c;
			if(typeof(o)!="object"){
				if(s){
					// ** function object function **
					m = s; s = e; e=o; o = this;
				}else{
					// ** function function **
					m = e; e = o; o = s = this;
				}
			}else if(!m){
				// ** object function function **
				m = s; s = this;
			}else if(once){
				// ** object function object function Boolean **
				c = dojo.connect(o, e, function(evt){
					dojo.hitch(s, m)(evt);
					dojo.disconnect(c);
				});
				this._cons.push(c);
				return c;
			}else{
				// ** object function object function **
			}
			c = dojo.connect(o, e, s, m);
			this._cons.push(c);
			return c;
		},

		disconnect: function(/*handle | Array*/handles){
			// summary:
			//		Removes connections based on passed
			//		handles arguments
			if(!handles){ return }
			if(!dojo.isArray(handles)){ handles=[handles]; }
			dojo.forEach(handles, dojo.disconnect, dojo);
		},

		connectMouse: function(){
			// summary:
			//		Internal. Registers this Stencil to receive
			//		mouse events.
			this._mouseHandle = this.mouse.register(this);
		},
		disconnectMouse: function(){
			// summary:
			//		Internal. Unregisters this Stencil from receiving
			//		mouse events.
			this.mouse.unregister(this._mouseHandle);
		},

		// Should be overwritten by sub class:
		render: function(){
			// summary:
			// 	This Stencil's render description. Often
			//	calls 'sub render' methods.
		},
		//renderOutline: function(){},
		dataToPoints: function(/*Object*/data){
			// summary:
			//		Converts data to points.
		},
		pointsToData: function(/*Array*/points){
			// summary:
			//		Converts points to data
		},
		onDown: function(/*EventObject*/obj){
			// summary:
			//		Mouse event, fired on mousedown on canvas
			//
			// by default, object is ready to accept data
			// turn this off for dragging or onRender will
			// keep firing and register the shape
			// NOTE: Not needed for all stencils. Axes needs it.
			this._downOnCanvas = true;
			dojo.disconnect(this._postRenderCon);
			this._postRenderCon = null;
		},
		onMove: function(/*EventObject*/obj){
			// summary:
			//		Mouse event, fired on mousemove while mouse
			//		is not down.
			//		NOTE: Not currently implemented
		},
		onDrag: function(/*EventObject*/obj){
			// summary:
			//		Mouse event, fired on mousemove while mouse
			// 		is down on canvas
		},
		onUp: function(/*EventObject*/obj){
			// summary:
			//		Mouse event, fired on mouseup
		}
	}
);

