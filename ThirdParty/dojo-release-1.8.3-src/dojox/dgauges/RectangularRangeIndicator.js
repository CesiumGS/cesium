define(["dojo/_base/declare", "dojox/gfx", "./ScaleIndicatorBase", "dojo/_base/event", "dojo/dom-geometry"],
	function(declare, gfx, ScaleIndicatorBase, eventUtil, domGeom){
	return declare("dojox.dgauges.RectangularRangeIndicator", ScaleIndicatorBase, {
		// summary:
		//		A RectangularRangeIndicator is used to represent a range of values on a scale.
		//		For adding this kind of indicator instance to the gauge, use the addIndicator 
		//		method of RectangularScale.

		// start: Number
		//		The start value of the range. Default is 0.
		start: 0,
		// startThickness: Number
		//		The thickness in pixels of the shape at the position defined by the start property.
		//		Default is 10.
		startThickness: 10,
		// endThickness: Number
		//		The thickness in pixels of the shape at the position defined by the value property.
		//		Default is 10.
		endThickness: 10,
		// fill: Object
		//		A fill object that will be passed to the setFill method of GFX.
		fill: null,
		// stroke: Object
		//		A stroke object that will be passed to the setStroke method of GFX.
		stroke: null,
		// paddingLeft: Number
		//		The left padding. Not used for horizontal gauges.
		paddingLeft: 10,
		// paddingTop: Number
		//		The top padding. Not used for vertical gauges.
		paddingTop: 10,
		// paddingRight: Number
		//		The right padding. Not used for horizontal gauges.
		paddingRight: 10,
		// paddingBottom: Number
		//		The bottom padding. Not used for vertical gauges.
		paddingBottom: 10,
		
		constructor: function(){
			this.fill = [255, 120, 0];
			this.stroke = {
				color: "black",
				width: .2
			};
			this.interactionMode = "none";
			
			this.addInvalidatingProperties(["start", "startThickness", "endThickness", "fill", "stroke"]);
		},

		_defaultHorizontalShapeFunc: function(indicator, group, scale, startX, startY, endPosition, startThickness, endThickness, fill, stroke){
			// summary:
			//		Internal method.
			// tags:
			//		private
			var gp = [startX, startY, endPosition, startY, endPosition, startY + endThickness, startX, startY + startThickness, startX, startY]
			if(fill && fill.colors){
				// Configure gradient
				fill.x1 = startX;
				fill.y1 = startY;
				fill.x2 = endPosition;
				fill.y2 = startY;
			}
			return group.createPolyline(gp).setFill(fill).setStroke(stroke);
		},

		_defaultVerticalShapeFunc: function(indicator, group, scale, startX, startY, endPosition, startThickness, endThickness, fill, stroke){
			// summary:
			//		Internal method.
			// tags:
			//		private
			var gp = [startX, startY, startX, endPosition, startX + endThickness, endPosition, startX, startY + startThickness, startX, startY]
			if(fill && fill.colors){
				// Configure gradient
				fill.x1 = startX;
				fill.y1 = startY;
				fill.x2 = startX;
				fill.y2 = endPosition;
			}
			return group.createPolyline(gp).setFill(fill).setStroke(stroke);
		},
				
		_shapeFunc: function(indicator, group, scale, startX, startY, endPosition, startThickness, endThickness, fill, stroke){
			// summary:
			//		Internal method.
			// tags:
			//		private
			if(this.scale._gauge.orientation == "horizontal"){
				this._defaultHorizontalShapeFunc(indicator, group, scale, startX, startY, endPosition, startThickness, endThickness, fill, stroke);
			}else{
				this._defaultVerticalShapeFunc(indicator, group, scale, startX, startY, endPosition, startThickness, endThickness, fill, stroke);
			}
		},
		
		refreshRendering: function(){
			this.inherited(arguments);
			
			if(this._gfxGroup == null || this.scale == null){
				return;
			}
			// gets position corresponding to the values
			var spos = this.scale.positionForValue(this.start);
			var v = isNaN(this._transitionValue) ? this.value : this._transitionValue;
			var pos = this.scale.positionForValue(v);
			this._gfxGroup.clear();
			
			var startX;
			var startY;
			var endPosition;
			if(this.scale._gauge.orientation == "horizontal"){
				startX = spos;
				startY = this.paddingTop;
				endPosition = pos;
			}else{
				startX = this.paddingLeft;
				startY = spos;
				endPosition = pos;
			}
			this._shapeFunc(this, this._gfxGroup, this.scale, startX, startY, endPosition, this.startThickness, this.endThickness, this.fill, this.stroke);
		},

		_onMouseDown: function(event){
			// summary:
			//		Internal method.
			// tags:
			//		private
			this.inherited(arguments);

			var np = domGeom.position(this.scale._gauge.domNode, true);
			this.set("value", this.scale.valueForPosition({x: event.pageX - np.x, y: event.pageY - np.y}));

			// prevent the browser from selecting text
			eventUtil.stop(event);
		},
		
		_onMouseMove: function(event){
			// summary:
			//		Internal method.
			// tags:
			//		private
			this.inherited(arguments);
			
			var np = domGeom.position(this.scale._gauge.domNode, true);
			this.set("value", this.scale.valueForPosition({x: event.pageX - np.x, y: event.pageY - np.y}));
		}
	})
});
