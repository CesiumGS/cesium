define(["dojo/_base/declare", "dojo/dom-construct", "dojo/_base/window", "dojox/gfx", "dojox/gfx/canvas", "./MagnifierLite"], function(declare, construct, window, gfx, canvas, MagnifierLite){
	
	return declare("dojox.image.Magnifier", MagnifierLite, {
		// summary:
		//		Adds magnification on a portion of an image element, using `dojox.gfx`
		//
		// description:
		//		An unobtrusive way to add an unstyled overlay
		//		above the srcNode image element. The overlay/glass is a
		//		scaled version of the src image (so larger images sized down
		//		are clearer).
		//
		//		over-ride the _createGlass method to create your custom surface,
		//		being sure to create an img node on that surface.

		_createGlass: function(){
			// summary:
			//		create the glassNode, and an img on a dojox.gfx surface

			// images are hard to make into workable templates, so just add outer overlay
			// and skip using dijit._Templated
			this.glassNode = construct.create('div', {
				style: {
					height: this.glassSize + "px",
					width: this.glassSize + "px"
				},
				className: "glassNode"
			}, window.body());
			this.surfaceNode = construct.create('div', null, this.glassNode);

			gfx.switchTo('canvas');
			this.surface = canvas.createSurface(this.surfaceNode, this.glassSize, this.glassSize);
			this.img = this.surface.createImage({
			   src: this.domNode.src,
			   width: this._zoomSize.w,
			   height: this._zoomSize.h
			});

		},

		_placeGlass: function(e){
			// summary:
			//		position the overlay centered under the cursor
			var x = e.pageX - 2,
				y = e.pageY - 2,
				xMax = this.offset.x + this.offset.w + 2,
				yMax = this.offset.y + this.offset.h + 2
			;

			// with svg, our mouseout connection to the image surface doesn't
			// fire, so we'r have to manually calculate offsets
			if(x < this.offset.x || y < this.offset.y || x > xMax || y > yMax){
				this._hideGlass();
			}else{
				this.inherited(arguments);
			}
		},

		_setImage: function(e){
			// summary:
			//		set the image's offset in the clipping window relative to the mouse position

			var xOff = (e.pageX - this.offset.x) / this.offset.w,
				yOff = (e.pageY - this.offset.y) / this.offset.h,
				x = (this._zoomSize.w * xOff * -1)+(this.glassSize*xOff),
				y = (this._zoomSize.h * yOff * -1)+(this.glassSize*yOff)
			;
			// set the image offset
			this.img.setShape({ x: x, y: y });

		}
	});	
});