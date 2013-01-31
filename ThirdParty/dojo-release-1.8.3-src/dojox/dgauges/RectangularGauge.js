define(["dojo/_base/declare", "./GaugeBase", "dojox/gfx/matrix"], function(declare, GaugeBase, matrix){
	return declare("dojox.dgauges.RectangularGauge", GaugeBase, {
		// summary:
		//		The base class for rectangular gauges.
		//		You can create custom horizontal or vertical gauges by extending this class.
		//		See dojox/dgauges/components/default/HorinzontalLinearGauge.js for an example of rectangular gauge.

		// orientation: "horizontal"|"vertical"
		//		The orientation of the gauge. Default is "horizontal".	
		orientation: "horizontal",
		
		// leading, middle and trailing graphical parts
		_middleParts: null,
		_leadingParts: null,
		_trailingParts: null,
		_baseParts: null,
		_classParts: null,
		_layoutInfos: {},
		constructor: function(){
		
			this.orientation = "horizontal";
			
			this._middleParts = [];
			this._leadingParts = [];
			this._trailingParts = [];
			this._baseParts = [];
			this._classParts = [];
			
			this._layoutInfos = {
				leading: {
					x: 0,
					y: 0,
					w: 0,
					h: 0
				},
				middle: {
					x: 0,
					y: 0,
					w: 0,
					h: 0
				},
				trailing: {
					x: 0,
					y: 0,
					w: 0,
					h: 0
				}
			};
			this.addInvalidatingProperties(["orientation"]);
			
		},
		
		addElement: function(name, element, location){
			// summary:
			//		Adds a element to the gauge.
			// name: String
			//		The name of the element to be added.
			// element: Object
			//		This parameter can be:
			//		- A function which takes on argument of type GFX Group and return null or a
			//		GFX element retrievable using the getElementRenderer() method.
			//		- A Scale instance, i.e. CircularScale or RectangularScale.
			//		- A TextIndicator instance.
			// location: String
			//		The area to place the element. Valid values are "leading"|"middle"|"trailing". Leading and trailing areas are fixed size. The
			//		middle area use the remaining size. If not specified, the element's refreshRendering 
			//		is called with the whole gauge size as argument.

			this.inherited(arguments);
			
			var obj = this._elements[this._elements.length - 1];
			
			if(location == "middle"){
				this._middleParts.push(obj);
			}else if(location == "leading"){
				this._leadingParts.push(obj);
			}else if(location == "trailing"){
				this._trailingParts.push(obj);
			}else{
				if(obj._isGFX){
					this._baseParts.push(obj);
				}else{
					this._classParts.push(obj);
				}
			}
		},
		
		removeElement: function(name){
			// summary:
			//		Remove the element defined by name from the gauge.
			// name: String
			//		The name of the element as defined using addElement.
			// returns: Object
			//		A reference to the removed element.		
			var obj = this.getElement(name);
			if(obj){
				if(this._middleParts && this._middleParts.indexOf(obj) >= 0){
					this._middleParts.splice(this._middleParts.indexOf(obj), 1);
				}else if(this._leadingParts && this._leadingParts.indexOf(obj) >= 0){
					this._leadingParts.splice(this._leadingParts.indexOf(obj), 1);
				}else if(this._trailingParts && this._trailingParts.indexOf(obj) >= 0){
					this._trailingParts.splice(this._trailingParts.indexOf(obj), 1);
				}else if(this._baseParts && this._baseParts.indexOf(obj) >= 0){
					this._baseParts.splice(this._baseParts.indexOf(obj), 1);
				}else if(this._classParts && this._classParts.indexOf(obj) >= 0){
					this._classParts.splice(this._classParts.indexOf(obj), 1);
				}
			}
			
			this.inherited(arguments);
		},
		
		_computeArrayBoundingBox: function(elements){
			// summary:
			//		Internal method.
			// tags:
			//		private
			if(elements.length == 0){
				return {
					x: 0,
					y: 0,
					w: 0,
					h: 0
				};
			}
			var res = {
				x: -Infinity,
				y: -Infinity,
				w: 0,
				h: 0
			};
			var bbox = null;
			for(var i = 0; i < elements.length; i++){
				bbox = this._computeBoundingBox(elements[i]._gfxGroup);
				if(!bbox){
					continue;
				}
				if(res.x < bbox.x){
					res.x = bbox.x;
				}
				if(res.w < bbox.width){
					res.w = bbox.width;
				}
				if(res.y < bbox.y){
					res.y = bbox.y;
				}
				if(res.h < bbox.height){
					res.h = bbox.height;
				}
			}
			if(res.x == -Infinity){
				res.x = 0;
			}
			if(res.y == -Infinity){
				res.y = 0;
			}
			
			return res;
		},
		
		refreshRendering: function(){
			if(this._widgetBox.w <= 0 || this._widgetBox.h <= 0){
				return;
			}
			var i;
			if(this._baseParts){
				for(i = 0; i < this._baseParts.length; i++){
					this._baseParts[i].width = this._widgetBox.w;
					this._baseParts[i].height = this._widgetBox.h;
					this._elementsRenderers[this._baseParts[i]._name] = this._baseParts[i].refreshRendering();
				}
			}
			
			if(this._leadingParts){
				for(i = 0; i < this._leadingParts.length; i++){
					this._elementsRenderers[this._leadingParts[i]._name] = this._leadingParts[i].refreshRendering();
				}
			}
			
			if(this._trailingParts){
				for(i = 0; i < this._trailingParts.length; i++){
					this._elementsRenderers[this._trailingParts[i]._name] = this._trailingParts[i].refreshRendering();
				}
			}
			
			var leadingBoundingBox = this._computeArrayBoundingBox(this._leadingParts);
			var trailingBoundingBox = this._computeArrayBoundingBox(this._trailingParts);
			var middleBoundingBox = {};
			
			if(this.orientation == "horizontal"){
				middleBoundingBox.x = leadingBoundingBox.x + leadingBoundingBox.w;
				middleBoundingBox.y = 0;
				middleBoundingBox.w = this._widgetBox.w - leadingBoundingBox.w - trailingBoundingBox.w;
				middleBoundingBox.h = this._widgetBox.h;
			}else{
				middleBoundingBox.x = 0;
				middleBoundingBox.y = leadingBoundingBox.y + leadingBoundingBox.h;
				middleBoundingBox.w = this._widgetBox.w; 
				middleBoundingBox.h = this._widgetBox.h - leadingBoundingBox.h - trailingBoundingBox.h;
			}
			
			this._layoutInfos = {
				leading: leadingBoundingBox,
				middle: middleBoundingBox,
				trailing: trailingBoundingBox
			};
			
			// translates middle part
			for(i = 0; i < this._middleParts.length; i++){
				this._middleParts[i]._gfxGroup.setTransform([matrix.translate(middleBoundingBox.x, middleBoundingBox.y)]);
			}
			
			// translates trailing part
			if(this._trailingParts){
				for(i = 0; i < this._trailingParts.length; i++){
					this._trailingParts[i]._gfxGroup.setTransform(matrix.translate(this._widgetBox.w - trailingBoundingBox.w, 0));
				}
			}
			
			// Render remaining elements (scales, ...)
			for(i = 0; i < this._classParts.length; i++){
				this._elementsRenderers[this._classParts[i]._name] = this._classParts[i].refreshRendering();
			}
		}
	})
});
