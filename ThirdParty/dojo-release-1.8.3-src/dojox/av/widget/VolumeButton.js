define(['dojo', 'dijit', 'dijit/_Widget', 'dijit/_TemplatedMixin', 'dijit/form/Button'],	// TODO: why button??
function(dojo, dijit, _Widget, _TemplatedMixin, Button){

return dojo.declare("dojox.av.widget.VolumeButton", [_Widget, _TemplatedMixin], {
	// summary:
	//		A volume widget to use with dojox.av.widget.Player
	// description:
	//		Controls and displays the volume of the media. This widget
	//		opens a slider on click that is used to adjust the volume.
	//		The icon changes according to the volume level.

	templateString: dojo.cache("dojox.av.widget","resources/VolumeButton.html"),

	postCreate: function(){
		// summary:
		//	Initialize the widget.
		//
		this.handleWidth = dojo.marginBox(this.handle).w;
		this.width = dojo.marginBox(this.volumeSlider).w;
		this.slotWidth = 100;
		dojo.setSelectable(this.handle, false);
		this.volumeSlider = this.domNode.removeChild(this.volumeSlider);
	},
	setMedia: function(/* Object */med){
		// summary:
		//		A common method to set the media in all Player widgets.
		//		May do connections and initializations.
		//
		this.media = med;
		this.updateIcon();
	},
	updateIcon: function(/*Float*/ vol){
		// summary:
		//		Changes the icon on the button according to volume level.
		//
		vol = (vol===undefined) ? this.media.volume() : vol;
		if(vol===0){
			dojo.attr(this.domNode, "class", "Volume mute");
		}else if(vol<.334){
			dojo.attr(this.domNode, "class", "Volume low");
		}else if(vol<.667){
			dojo.attr(this.domNode, "class", "Volume med");
		}else{
			dojo.attr(this.domNode, "class", "Volume high");
		}
	},

	onShowVolume: function(/*DOMEvent*/evt){
		// summary:
		//		Shows the volume slider.
		//
		if(this.showing==undefined){
			dojo.body().appendChild(this.volumeSlider);
			this.showing = false;
		}
		if(!this.showing){

			var TOPMARG = 2;
			var LEFTMARG = 7;
			var vol = this.media.volume();
			var dim = this._getVolumeDim();
			var hand = this._getHandleDim();
			this.x = dim.x - this.width;



			dojo.style(this.volumeSlider, "display", "");
			dojo.style(this.volumeSlider, "top", dim.y+"px");
			dojo.style(this.volumeSlider, "left", (this.x)+"px");

			var x = (this.slotWidth * vol);

			dojo.style(this.handle, "top", (TOPMARG+(hand.w/2))+"px");
			dojo.style(this.handle, "left", (x+LEFTMARG+(hand.h/2))+"px");

			this.showing = true;
			//this.startDrag();

			this.clickOff = dojo.connect(dojo.doc, "onmousedown", this, "onDocClick");
		}else{
			this.onHideVolume();
		}
	},
	onDocClick: function(/*DOMEvent*/evt){
		// summary:
		//		Fired on document.onmousedown. Checks if clicked inside
		//		of this widget or not.
		//
		if(!dojo.isDescendant(evt.target, this.domNode) && !dojo.isDescendant(evt.target, this.volumeSlider)){
			this.onHideVolume();
		}
	},

	onHideVolume: function(){
		// summary:
		//		Hides volume slider.

		this.endDrag();
		dojo.style(this.volumeSlider, "display", "none");
		this.showing = false;
	},

	onDrag: function(/*DOMEvent*/evt){
		// summary:
		//		Fired on mousemove. Updates volume and position of
		//		slider handle.
		var beg = this.handleWidth/2;
		var end = beg + this.slotWidth
		var x = evt.clientX - this.x;
		if(x<beg) x = beg;
		if(x>end) x=end;
		dojo.style(this.handle, "left", (x)+"px");

		var p = (x-beg)/(end-beg);
		this.media.volume(p);
		this.updateIcon(p);
	},
	startDrag: function(){
		// summary:
		//		Fired on mousedown of the slider handle.

		this.isDragging = true;
		this.cmove = dojo.connect(dojo.doc, "mousemove", this, "onDrag");
		this.cup = dojo.connect(dojo.doc, "mouseup", this, "endDrag");
	},
	endDrag: function(){
		// summary:
		//		Fired on mouseup of the slider handle.

		this.isDragging = false;
		if(this.cmove) dojo.disconnect(this.cmove);
		if(this.cup) dojo.disconnect(this.cup);
		this.handleOut();
	},

	handleOver: function(){
		// summary:
		//		Highlights the slider handle on mouseover, and
		//		stays highlighted during drag.

		dojo.addClass(this.handle, "over");
	},
	handleOut: function(){
		// summary:
		//		Unhighlights handle onmouseover, or on endDrag.
		//
		if(!this.isDragging){
			dojo.removeClass(this.handle, "over");
		}
	},

	_getVolumeDim: function(){
		// summary:
		//		Gets dimensions of slider background node.
		//		Only uses dojo.coords once, unless the page
		//		or player is resized.

		if(this._domCoords){
			return this._domCoords;
		}
		this._domCoords = dojo.coords(this.domNode);
		return this._domCoords;
	},
	_getHandleDim: function(){
		// summary:
		//		Gets dimensions of slider handle.
		//		Only uses dojo.marginBox once.
		if(this._handleCoords){
			return this._handleCoords;
		}
		this._handleCoords = dojo.marginBox(this.handle);
		return this._handleCoords;
	},

	onResize: function(/*Object*/playerDimensions){
		// summary:
		//		Fired on player resize. Zeros dimensions
		//		so that it can be calculated again.

		this.onHideVolume();
		this._domCoords = null;
	}
});

});
