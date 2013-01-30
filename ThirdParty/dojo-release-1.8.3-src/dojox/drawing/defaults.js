define({
	// summary:
	//		Styles and defaults used for Drawing stencils and text.
	// description:
	//		This object contains defaults for objects used in Drawing.
	//		To change one item's style, use item.attr();
	//		To change all these styles, create a copy of this file
	//		and point to it in the Drawing properties:
	//		|	<div dojoType="dojox.drawing.Drawing" id="drawing" defaults="MyCustom.defaults"></div>
	//
	//		See: Drawing.changeDefaults

	// clickMode: Boolean
	//		Determines whether in draw or edit mode (whether stencils
	//		are clickable.  If clickMode is false, the original
	//		functionality of silently switching between select modes
	//		is enabled.  If clickMode is true, it allows powerpoint-
	//		like functionality.  Clickable is used by powerpoint to
	//		distinguish when things can be selected and when they can't
	clickMode:true,

	clickable:true,

	// current: Object
	// 	 current will point to either null or selected
	current:null,
	// currentHit: Object
	//		currentHit will point to either hitNorm or hitSelected
	currentHit:null,

	// angleSnap: Number
	//		Line, arrows, vector and axes will all snap to this angle on mouse up
	//		shown angle also reflects the snap
	//		currently cannot accept less than 1 degree
	angleSnap:1,

	// zAxis:  Boolean
    //		If true, draw current object in z-direction.
	// zAxisEnabled: Boolean
    //		If true, render axes with Z-axis included, allow objects drawn in z-direction.
	//		If false the z-axis button will not show up.
	zAxis: false,
	zAxisEnabled: true,
	zAngle: 225,
	
	// renderHitLines: Boolean
	//		If true, renders a second, larger layer for lines to make
	//		them more easily clickable.
	renderHitLines: true,

	// renderHitLayer:
	//		If true, renders a second layer for each Stencil, one
	//		acting as a 'hit' object for a wider mouse-click area.
	//		It also doubles as a hilight. If true, overrides
	//		renderHitLines setting.
	renderHitLayer:true,

	// labelSameColor:
	//		If true, the label text color will be the same as the
	//		Stencil's line color.
	labelSameColor:false,

	useSelectedStyle: true,

	norm:{
		// summary:
		//		Normal style of all shapes
		//		will get overridden by
		//		above andes styles
		width:1,
		color:"#000000",
		style:"Solid",
		cap:"round", // square, butt, round
		fill:"#CCCCCC"
	},

	selected:{
		// summary:
		//		Selected style of all shapes
		//		styles not shown will used from
		//	norm
		width:6,
		color:"#00FF00"
	},

	highlighted:{
		// summary:
		//		Highlighted style of all shapes
		//		NOT CURRENTLY BEING USED
		width:6,
		color:"#FF00FF",
		style:"Solid",
		cap:"round",
		fill:"#E11EBB"
	},

	disabled:{
		// summary:
		//		Disabled or "locked" or "fade" style of all shapes
		width:1,
		color:"#666666",
		style:"solid",
		cap:"round",
		fill:"#cccccc"
	},

	// "hit" refers to the hidden object below the shape
	// that is usually larger than the object to give a
	// larger 'target' to click upon. These hit objects
	// double as highlights.
	hitNorm:{
		// summary:
		//		Normal style of a hit area
		width:6,
		color:{r:0, g:255, b:255, a:0},
		style:"Solid",
		cap:"round",
		fill:{r:255, g:255, b:255, a:0}
	},
	hitSelected:{
		// summary:
		//		Selected style of a hit area
		width:6,
		color:"#FF9900",
		style:"Solid",
		cap:"round",
		fill:{r:255, g:255, b:255, a:0}
	},
	hitHighlighted:{
		// summary:
		//		Highlighted style of a hit area
		width:6,
		color:"#FFFF00",
		style:"Solid",
		cap:"round",
		fill:{r:255, g:255, b:255, a:0}
	},


	anchors:{
		// summary:
		//		Style for the anchor resize-points
		size:10,
		width:2,
		color:"#999",
		style:"solid",
		fill:"#fff",
		cap:"square",
		minSize:10,
		marginZero:5 // not really an anchor prop
	},
	arrows:{
		// summary:
		//		Size of arrows on vectors.
		//		length is in pixels
		//		width is actually an angle
		//		but is close to pixels in size
		length:30,
		width:16
	},
	text:{
		// summary:
		//		Style of text
		minWidth:100,
		deleteEmptyCreate:true,
		deleteEmptyModify:true,
		pad:3,
		size:"18px",
		family:"sans-serif",
		weight:"normal",
		color:"#000000"
	},
	textDisabled:{
		// summary:
		//		Style of disabled text
		size:"18px",
		family:"sans-serif",
		weight:"normal",
		color:"#cccccc"
	},

	textMode:{
		// summary:
		//		These styles apply to the containing
		//		text box (edit mode), and not the text itself
		create:{
			width:2,
			style:"dotted",
			color:"#666666",
			fill:null
		},
		edit:{
			width:1,
			style:"dashed",
			color:"#666",
			fill:null
		}

	},

	button:{
		norm:{
			"color": "#cccccc",
			"fill": {
				type:"linear",
				x1:0, x2:0, y1:0, y2:100,
				colors:[
					{offset:.5, color:"#ffffff"},
					{offset:1, color:"#e5e5e5"}
				]
			}
		},
		over:{
			"fill": {
				type:"linear",
				x1:0, x2:0, y1:0, y2:100,
				colors:[{offset:.5, color:"#ffffff"}, {offset:1, color:"#e1eaf5"}]
			},
			"color": "#92a0b3"
		},
		down:{
			"fill": {
				type:"linear",
				x1:0, x2:0, y1:0, y2:100,
				colors:[{offset:0, color:"#e1eaf5"}, {offset:1, color:"#ffffff"}]
			},
			"color": "#92a0b3"
		},
		selected:{
			"fill": {
				type:"linear",
				x1:0, x2:0, y1:0, y2:100,
				colors:[{offset:0, color:"#97b4bf"}, {offset:1, color:"#c8dae1"}]
			},
			"color": "#92a0b3"
		},
		icon:{
			norm:{
				fill:null,
				color:"#92a0b3"
			},
			selected:{
				fill:"#ffffff",
				color:"#92a0b3"
			}
		}
	},

	copy: function(){
		// summary:
		//		Each shape gets its own copy
		//		of these styles so that instances
		//		do not change each other's styles

		var cpy = function(obj){
				if(typeof(obj)!="object" || obj===null || obj===undefined){
					return obj;
				}
				var o;
				if(obj.push){
					o = [];
					for(var i=0; i<obj.length;i++){
						o.push(cpy(obj[i]))
					}
					return o;
				}
			o = {};
			for(var nm in obj){
				if(nm!="copy"){
					if(typeof(obj[nm])=="object"){
						o[nm] = cpy(obj[nm]);
					}else{
						o[nm] = obj[nm]
					}
				}
			}
			return o;
		};
		var o = cpy(this);
		o.current = o.norm;
		o.currentHit = o.hitNorm;
		o.currentText = o.text;
		return o;
	}

});
