define(['dojo', 'dijit', 'dijit/_Widget', 'dijit/_TemplatedMixin'],function(dojo, dijit, _Widget, _TemplatedMixin){

return dojo.declare("dojox.av.widget.ProgressSlider", [_Widget, _TemplatedMixin], {
	// summary:
	//		A custom slider widget to use with dojox.av.widget.Player.
	// description:
	//		Displays the current playhead position of the media. Has two
	//		progress bars: one for playhead position, and one for download
	//		progress.

	templateString: dojo.cache("dojox.av.widget","resources/ProgressSlider.html"),
	postCreate: function(){
		// summary:
		//		Initialize slider.

		this.seeking = false;
		this.handleWidth = dojo.marginBox(this.handle).w;
		var dim = dojo.coords(this.domNode);
		this.finalWidth = dim.w
		this.width = dim.w-this.handleWidth;
		this.x = dim.x;

		dojo.setSelectable(this.domNode, false);
		dojo.setSelectable(this.handle, false);
	},
	setMedia: function(/* Object */med, playerWidget){
		// summary:
		//		A common method to set the media in all Player widgets.
		//		May do connections and initializations.

		this.playerWidget = playerWidget;
		this.media = med;
		dojo.connect(this.media, "onMetaData", this, function(data){
			if(data && data.duration){
				this.duration = data.duration;
			}
		});
		dojo.connect(this.media, "onEnd", this,  function(){
			dojo.disconnect(this.posCon);
			this.setHandle(this.duration);
		});
		dojo.connect(this.media, "onStart", this, function(){
			this.posCon = dojo.connect(this.media, "onPosition", this, "setHandle");
		});

		dojo.connect(this.media, "onDownloaded", this, function(percent){
			this.setLoadedPosition(percent*.01);
			this.width = this.finalWidth * .01 * percent;
		});

	},
	onDrag: function(/* HTMLEvent */ evt){
		// summary:
		//		Fired when the mouse is moved. Sets the slider.

		var x = evt.clientX - this.x;
		if(x<0) x = 0;
		if(x>this.width-this.handleWidth) x=this.width-this.handleWidth;

		var p = x/this.finalWidth;
		this.media.seek( this.duration * p );
		dojo.style(this.handle, "marginLeft", x+"px");
		dojo.style(this.progressPosition, "width", x+"px");
	},
	startDrag: function(){
		// summary:
		//		Fired onmousedown of the slider handle.

		dojo.setSelectable(this.playerWidget.domNode, false);
		this.seeking = true;
		this.cmove = dojo.connect(dojo.doc, "mousemove", this, "onDrag");
		this.cup = dojo.connect(dojo.doc, "mouseup", this, "endDrag");
	},
	endDrag: function(){
		// summary:
		//		Fired on document.onmouseup.

		dojo.setSelectable(this.playerWidget.domNode, true);
		this.seeking = false;
		if(this.cmove) dojo.disconnect(this.cmove);
		if(this.cup) dojo.disconnect(this.cup);
		this.handleOut();
	},

	setHandle: function(time){
		// summary:
		//		Sets the slider handle (when it is not being dragged)

		if(!this.seeking){
			var w = this.width-this.handleWidth;
			var p = time/this.duration;
			var x = p*w;

			dojo.style(this.handle, "marginLeft", x+"px");
			dojo.style(this.progressPosition, "width", x+"px");
		}
	},

	setLoadedPosition: function(decimal){
		// summary:
		//		Sets the download progress bar to the percentage of how much
		//		the media has been downloaded.
		dojo.style(this.progressLoaded, "width", (this.finalWidth*decimal)+"px");
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

		if(!this.seeking){
			dojo.removeClass(this.handle, "over");
		}
	},
	onResize: function(playerDimensions){
		// summary:
		//		Handles player resize. Need to recalculate the width of
		//		position an download bars.
		var dim = dojo.coords(this.domNode);
		this.finalWidth = dim.w;

	}

});

});
