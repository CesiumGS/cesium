define(["dojo/_base/declare", "dojox/gfx", "./ScaleBase"], function(declare, gfx, ScaleBase){
	return declare("dojox.dgauges.RectangularScale", ScaleBase, {
		// summary:
		//		The rectangular scale. A scaler must be set to use this class.

		// paddingLeft: Number
		//		The left padding.
		paddingLeft: 15,
		// paddingTop: Number
		//		The top padding.
		paddingTop: 12,
		// paddingRight: Number
		//		The right padding.
		paddingRight: 15,
		// paddingBottom: Number
		//		The bottom padding.
		paddingBottom: 0,
		_contentBox: null,		
		constructor: function(){
			this.labelPosition = "leading";
			this.addInvalidatingProperties(["paddingTop", "paddingLeft", "paddingRight", "paddingBottom"]);
		},
		
		positionForValue: function(value){
			// summary:
			//		Transforms a value into a position using the associated scaler.
			// value:
			//		The value to transform.
			// returns: Number
			//		A position in pixels.
			var relativePos = 0;
			var position;
			var spos = 0;
			var length = 0;
			if(this._contentBox){
				if(this._gauge.orientation == "horizontal"){
					spos = this._contentBox.x;
					length = this._contentBox.w;
				}else{
					spos = this._contentBox.y;
					length = this._contentBox.h;
				}
			}
			relativePos = this.scaler.positionForValue(value);
			position = spos + (relativePos * length);
			return position;
		},
		
		valueForPosition: function(pos){
			// summary:
			//		Transforms a position in pixels into a value using the associated scaler.
			// pos:
			//		The position to transform.
			// returns: Number
			//		The value represented by pos. 
			var value = this.scaler.minimum;
			var position = NaN;
			var spos = 0;
			var epos = 0;
			
			if(this._gauge.orientation == "horizontal"){
				position = pos.x;
				spos = this._contentBox.x;
				epos = this._contentBox.x + this._contentBox.w;
			}else{
				position = pos.y;
				spos = this._contentBox.y;
				epos = this._contentBox.y + this._contentBox.h;
			}
			
			if(position <= spos){
				value = this.scaler.minimum;
			}else if(position >= epos){
				value = this.scaler.maximum;
			}else {
				value = this.scaler.valueForPosition((position - spos)/(epos - spos));
			}
			return value;
			
		},
		
		refreshRendering: function(){
			this.inherited(arguments);
			if(!this._gfxGroup || !this.scaler) 
				return;
			
			this._ticksGroup.clear();
			
			// variables for ticks rendering
			var middleBox = this._gauge._layoutInfos.middle;
			
			this._contentBox = {};
			
			this._contentBox.x = middleBox.x + this.paddingLeft;
			this._contentBox.y = middleBox.y + this.paddingTop;
			this._contentBox.w = middleBox.w - (this.paddingLeft + this.paddingRight);
			this._contentBox.h = middleBox.h - (this.paddingBottom + this.paddingTop);
			var renderer;
			
			// variables for tick labels
			var labelText;
			var font = this._getFont();
			
			// Layout ticks
			var allTicks = this.scaler.computeTicks();
			
			for(var i = 0; i < allTicks.length; i++){
				var tickItem = allTicks[i];
				renderer = this.tickShapeFunc(this._ticksGroup, this, tickItem);
				
				if(renderer){
					var a = this.positionForValue(tickItem.value);
					var tickSize = this._gauge._computeBoundingBox(renderer).width;
					
					var x1 = 0, y1 = 0, angle = 0;
					if(this._gauge.orientation == "horizontal"){
						x1 = a;
						y1 = this._contentBox.y;
						angle = 90;
					}else{
						x1 = this._contentBox.x;
						y1 = a;
					}
					
					renderer.setTransform([{
						dx: x1,
						dy: y1
					}, gfx.matrix.rotateg(angle)]);
				}
				
				labelText = this.tickLabelFunc(tickItem);
				
				if(labelText){
					var tbox = gfx._base._getTextBox(labelText, {
						font: gfx.makeFontString(gfx.makeParameters(gfx.defaultFont, font))
					});
					var tw = tbox.w;
					var th = tbox.h;
					var al = "start";
					var xt = x1;
					var yt = y1;
					
					if(this._gauge.orientation == "horizontal"){
						xt = x1;
						if(this.labelPosition == "trailing"){
							yt = y1 + tickSize + this.labelGap + th;
						}else{
							yt = y1 - this.labelGap;
						}
						al = "middle";
					}else{
						if(this.labelPosition == "trailing"){
							xt = x1 + tickSize + this.labelGap;
						}else{
							xt = x1 - this.labelGap - tw;
						}
						yt = y1 + th / 2;
					}
					
					var t = this._ticksGroup.createText({
						x: xt,
						y: yt,
						text: labelText,
						align: al
					});
					t.setFill(font.color ? font.color : "black");
					t.setFont(font);
				}
			}
			
			for(var key in this._indicatorsIndex){
				this._indicatorsRenderers[key] = this._indicatorsIndex[key].invalidateRendering();
			}
		}
	})
});
