define(["dojo/_base/declare", "dojox/gfx", "./ScaleBase", "./_circularUtils"], function(declare, gfx, ScaleBase, _circularUtils){
	return declare("dojox.dgauges.CircularScale", ScaleBase, {
		// summary:
		//		The circular scale. A scaler must be set to use this class.

		// originX: Number
		//		The origin x-coordinate of the scale in pixels.
		originX: 50,
		// originY: Number
		//		The origin y-coordinate of the scale in pixels.
		originY: 50,
		// radius: Number
		//		The outer radius in pixels of the scale.
		radius: 50,
		// startAngle: Number
		//		The start angle of the scale in degrees.
		startAngle: 0,
		// endAngle: Number
		//		The end angle of the scale in degrees.
		endAngle: 180,
		// orientation: String
		//		The orientation of the scale. Can be "clockwise" or "cclockwise".
		//		The default value is "clockwise".
		orientation: "clockwise",
		
		constructor: function(){

			this.labelPosition = "inside";
			
			this.addInvalidatingProperties(["originX", "originY", "radius", "startAngle", "endAngle", "orientation"]);
		},
		
		_getOrientationNum: function(){
			// summary:
			//		Internal method.
			// tags:
			//		private
			return this.orientation == "cclockwise" ? -1 : 1;
		},
		
		positionForValue: function(/* Number */value){
			// summary:
			//		Transforms a value into an angle using the associated scaler.
			// returns: Number
			//		An angle in degrees.
			var totalAngle = _circularUtils.computeTotalAngle(this.startAngle, this.endAngle, this.orientation);
			var relativePos = this.scaler.positionForValue(value);
			return _circularUtils.modAngle(this.startAngle + this._getOrientationNum() * totalAngle * relativePos, 360);
		},
		
		_positionForTickItem: function(tickItem){
			// summary:
			//		Internal method.
			// tags:
			//		private
			var totalAngle = _circularUtils.computeTotalAngle(this.startAngle, this.endAngle, this.orientation);
			return _circularUtils.modAngle(this.startAngle + this._getOrientationNum() * totalAngle * tickItem.position, 360);
		},
		
		valueForPosition: function(/* Number */angle){
			// summary:
			//		Transforms an angle in degrees into a value using the associated scaler.
			// returns: Number
			//		The value represented by angle. 
			if(!this.positionInRange(angle)){
				var min1 = _circularUtils.modAngle(this.startAngle - angle, 360);
				var min2 = 360 - min1;
				var max1 = _circularUtils.modAngle(this.endAngle - angle, 360);
				var max2 = 360 - max1;
				var pos;
				if(Math.min(min1, min2) < Math.min(max1, max2)){
					pos = 0;
				}else{
					pos = 1;
				}
			}else{
				var relativeAngle = _circularUtils.modAngle(this._getOrientationNum() * (angle - this.startAngle), 360);
				var totalAngle = _circularUtils.computeTotalAngle(this.startAngle, this.endAngle, this.orientation);
				pos = relativeAngle / totalAngle;
			}
			return this.scaler.valueForPosition(pos);
		},
		
		positionInRange: function(/* Number */value){
			// summary:
			//		Returns true if the value parameter is between the accepted scale positions.
			// returns: Boolean
			//		True if the value parameter is between the accepted scale positions.
			if(this.startAngle == this.endAngle){
				return true;
			}
			value = _circularUtils.modAngle(value, 360);
			if(this._getOrientationNum() == 1){
				if(this.startAngle < this.endAngle){
					return value >= this.startAngle && value <= this.endAngle;
				}else{
					return !(value > this.endAngle && value < this.startAngle);
				}
			}else{
				if(this.startAngle < this.endAngle){
					return !(value > this.startAngle && value < this.endAngle);
				}else{
					return value >= this.endAngle && value <= this.startAngle;
				}
			}
		},
		
		_distance: function(x1, y1, x2, y2){
			// summary:
			//		Internal method.
			// tags:
			//		private
			return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
		},
		
		_layoutLabel: function(label, txt, ox, oy, lrad, angle, labelPlacement){
			// summary:
			//		Internal method.
			// tags:
			//		private
			var font = this._getFont();
			var box = gfx._base._getTextBox(txt, {
				font: gfx.makeFontString(gfx.makeParameters(gfx.defaultFont, font))
			});
			var tw = box.w;
			var fz = font.size;
			var th = gfx.normalizedLength(fz);
			
			var tfx = ox + Math.cos(angle) * lrad - tw / 2;
			var tfy = oy - Math.sin(angle) * lrad - th / 2;
			var side;
			
			var intersections = [];
			
			// Intersection with top segment
			side = tfx;
			var ipx = side;
			var ipy = -Math.tan(angle) * side + oy + Math.tan(angle) * ox;
			// Verify if intersection is on segment
			if(ipy >= tfy && ipy <= tfy + th){
				intersections.push({
					x: ipx,
					y: ipy
				});
			}
			
			// Intersection with bottom segment
			side = tfx + tw;
			ipx = side;
			ipy = -Math.tan(angle) * side + oy + Math.tan(angle) * ox;
			// Verify if intersection is on segment
			if(ipy >= tfy && ipy <= tfy + th){
				intersections.push({
					x: ipx,
					y: ipy
				});
			}
			// Intersection with left segment
			side = tfy;
			ipx = -1 / Math.tan(angle) * side + ox + 1 / Math.tan(angle) * oy;
			ipy = side;
			// Verify if intersection is on segment
			if(ipx >= tfx && ipx <= tfx + tw){
				intersections.push({
					x: ipx,
					y: ipy
				});
			}
			// Intersection with right segment
			side = tfy + th;
			ipx = -1 / Math.tan(angle) * side + ox + 1 / Math.tan(angle) * oy;
			ipy = side;
			// Verify if intersection is on segment
			if(ipx >= tfx && ipx <= tfx + tw){
				intersections.push({
					x: ipx,
					y: ipy
				});
			}
			var dif;
			if(labelPlacement == "inside"){
				for(var it = 0; it < intersections.length; it++){
					var ip = intersections[it];
					dif = this._distance(ip.x, ip.y, ox, oy) - lrad;
					if(dif >= 0){
						// Place reference intersection point on reference circle
						tfx = ox + Math.cos(angle) * (lrad - dif) - tw / 2;
						tfy = oy - Math.sin(angle) * (lrad - dif) - th / 2;
						break;
					}
				}
			}else{// "outside" placement
				for(it = 0; it < intersections.length; it++){
					ip = intersections[it];
					dif = this._distance(ip.x, ip.y, ox, oy) - lrad;
					if(dif <= 0){
						// Place reference intersection point on reference circle
						tfx = ox + Math.cos(angle) * (lrad - dif) - tw / 2;
						tfy = oy - Math.sin(angle) * (lrad - dif) - th / 2;
						
						break;
					}
				}
			}
			if(label){
				label.setTransform([{
					dx: tfx + tw / 2,
					dy: tfy + th
				}]);
			}
		},
		
		refreshRendering: function(){
			this.inherited(arguments);
			if(!this._gfxGroup || !this.scaler){
				return;
			}
			
			// Normalize angles
			this.startAngle = _circularUtils.modAngle(this.startAngle, 360);
			this.endAngle = _circularUtils.modAngle(this.endAngle, 360);
			
			this._ticksGroup.clear();
			
			var renderer;
			var label;
			var labelText;
			
			// Layout ticks
			var allTicks = this.scaler.computeTicks();
			
			var tickBB;
			for(var i = 0; i < allTicks.length; i++){
				var tickItem = allTicks[i];
				renderer = this.tickShapeFunc(this._ticksGroup, this, tickItem);
				
				tickBB = this._gauge._computeBoundingBox(renderer);
				var a;
				if(tickItem.position){
					a = this._positionForTickItem(tickItem);
				}else{
					a = this.positionForValue(tickItem.value);
				}
				if(renderer){
					renderer.setTransform([{
						dx: this.originX,
						dy: this.originY
					}, gfx.matrix.rotateg(a), {
						dx: this.radius - tickBB.width - 2 * tickBB.x,
						dy: 0
					}]);
				}
				labelText = this.tickLabelFunc(tickItem);
				if(labelText){
					label = this._ticksGroup.createText({
						x: 0,
						y: 0,
						text: labelText,
						align: "middle"
					}).setFont(this._getFont()).setFill(this._getFont().color ? this._getFont().color : "black");
					var rad = this.radius;
					if(this.labelPosition == "inside"){
						rad -= (tickBB.width + this.labelGap);
					}else{
						rad += this.labelGap;
					}
					this._layoutLabel(label, labelText, this.originX, this.originY, rad, _circularUtils.toRadians(360 - a), this.labelPosition);
				}
			}
			
			for(var key in this._indicatorsIndex){
				this._indicatorsRenderers[key] = this._indicatorsIndex[key].invalidateRendering();
			}
		}
	});
});
