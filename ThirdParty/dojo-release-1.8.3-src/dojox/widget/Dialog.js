define([
	"dojo", "dojox", "dojo/text!./Dialog/Dialog.html", 
	"dijit/Dialog", "dojo/window", "dojox/fx", "./DialogSimple"
], function(dojo, dojox, template){

	dojo.getObject('widget', true, dojox);
	
	dojo.declare('dojox.widget.Dialog', dojox.widget.DialogSimple,
		{
		// summary:
		//		A Lightbox-like Modal-dialog for HTML Content
		// description:
		//		An HTML-capable Dialog widget with advanced sizing
		//		options, animated show/hide and other useful options.
		//
		//		This Dialog is also very easy to apply custom styles to.
		//
		//		It works identically to a `dijit.Dialog` with several
		//		additional parameters.

		templateString: template,

		// sizeToViewport: Boolean
		//		If true, fix the size of the dialog to the Viewport based on
		//		viewportPadding value rather than the calculated or natural
		//		style. If false, base the size on a passed dimension attribute.
		//		Either way, the viewportPadding value is used if the the content
		//		extends beyond the viewport size for whatever reason.
		sizeToViewport: false,

		// viewportPadding: Integer
		//		If sizeToViewport="true", this is the amount of padding in pixels to leave
		//		between the dialog border and the viewport edge.
		//		This value is also used when sizeToViewport="false" and dimensions exceeded
		//		by dialog content to ensure dialog does not go outside viewport boundary
		viewportPadding: 35,

		// dimensions: Array
		//		A two-element array of [width,height] to animate the Dialog to if sizeToViewport="false"
		//		Defaults to [300,300]
		dimensions: null,

		// easing: Function?|String?
		//		An easing function to apply to the sizing animation.
		easing: null,

		// sizeDuration: Integer
		//		Time (in ms) to use in the Animation for sizing.
		sizeDuration: dijit._defaultDuration,

		// sizeMethod: String
		//		To be passed to dojox.fx.sizeTo, one of "chain" or "combine" to effect
		//		the animation sequence.
		sizeMethod: "chain",

		// showTitle: Boolean
		//		Toogle to show or hide the Title area. Can only be set at startup.
		showTitle: false,

		// draggable: Boolean
		//		Make the pane draggable. Differs from dijit.Dialog by setting default to false
		draggable: false, // simply over-ride the default from dijit.Dialog

		// modal: Boolean
		//		If true, this Dialog instance will be truly modal and prevent closing until
		//		explicitly told to by calling hide() - Defaults to false to preserve previous
		//		behaviors.
		modal: false,

		constructor: function(props, node){
			this.easing = props.easing || dojo._defaultEasing;
			this.dimensions = props.dimensions || [300, 300];
		},

		_setup: function(){
			// summary:
			//		Piggyback on dijit.Dialog's _setup for load-time options, deferred to

			this.inherited(arguments);
			if(!this._alreadyInitialized){
				this._navIn = dojo.fadeIn({ node: this.closeButtonNode });
				this._navOut = dojo.fadeOut({ node: this.closeButtonNode });
				if(!this.showTitle){
					dojo.addClass(this.domNode,"dojoxDialogNoTitle");
				}
			}
		},

		layout: function(e){
			this._setSize();
			this.inherited(arguments);
		},

		_setSize: function(){
			// summary:
			//		cache and set our desired end position
			this._vp = dojo.window.getBox();
			var tc = this.containerNode,
				vpSized = this.sizeToViewport
			;
			return this._displaysize = {
				w: vpSized ? tc.scrollWidth : this.dimensions[0],
				h: vpSized ? tc.scrollHeight : this.dimensions[1]
			}; // Object
		},

		show: function(){
			if(this.open){ return; }

			this._setSize();
			dojo.style(this.closeButtonNode,"opacity", 0);
			dojo.style(this.domNode, {
				overflow: "hidden",
				opacity: 0,
				width: "1px",
				height: "1px"
			});
			dojo.style(this.containerNode, {
				opacity: 0,
				overflow: "hidden"
			});

			this.inherited(arguments);

			if(this.modal){
				// prevent escape key from closing dialog
				// connect to body to trap this event from the Dialog a11y code, and stop escape key
				// from doing anything in the modal:true case:
				this._modalconnects.push(dojo.connect(dojo.body(), "onkeypress", function(e){
					if(e.charOrCode == dojo.keys.ESCAPE){
						dojo.stopEvent(e);
					}
				}));
			}else{
				// otherwise, allow clicking on the underlay to close
				this._modalconnects.push(dojo.connect(dijit._underlay.domNode, "onclick", this, "onCancel"));
			}
			this._modalconnects.push(dojo.connect(this.domNode,"onmouseenter",this,"_handleNav"));
			this._modalconnects.push(dojo.connect(this.domNode,"onmouseleave",this,"_handleNav"));

		},

		_handleNav: function(e){
			// summary:
			//		Handle's showing or hiding the close icon

			var navou = "_navOut",
				navin = "_navIn",
				animou = (e.type == "mouseout" ? navin : navou),
				animin = (e.type == "mouseout" ? navou : navin)
			;

			this[animou].stop();
			this[animin].play();

		},

		// an experiment in a quicksilver-like hide. too choppy for me.
		/*
		hide: function(){
			// summary:
			//		Hide the dialog

			// if we haven't been initialized yet then we aren't showing and we can just return
			if(!this._alreadyInitialized){
				return;
			}

			this._fadeIn && this._fadeIn.stop();

			if (this._scrollConnected){
				this._scrollConnected = false;
			}
			dojo.forEach(this._modalconnects, dojo.disconnect);
			this._modalconnects = [];
			if(this.refocus){
				this.connect(this._fadeOut,"onEnd",dojo.hitch(dijit,"focus",this._savedFocus));
			}
			if(this._relativePosition){
				delete this._relativePosition;
			}

			dojox.fx.sizeTo({
				node: this.domNode,
				duration:this.sizeDuration || this.duration,
				width: this._vp.w - 1,
				height: 5,
				onBegin: dojo.hitch(this,function(){
					this._fadeOut.play(this.sizeDuration / 2);
				})
			}).play();

			this.open = false;
		}, */

		_position: function(){

			if(!this._started){ return; } // prevent content: from firing this anim #8914

			if(this._sizing){
				this._sizing.stop();
				this.disconnect(this._sizingConnect);
				delete this._sizing;
			}

			this.inherited(arguments);

			if(!this.open){ dojo.style(this.containerNode, "opacity", 0); }
			var pad = this.viewportPadding * 2;

			var props = {
				node: this.domNode,
				duration: this.sizeDuration || dijit._defaultDuration,
				easing: this.easing,
				method: this.sizeMethod
			};

			var ds = this._displaysize || this._setSize();
			props['width'] = ds.w = (ds.w + pad >= this._vp.w || this.sizeToViewport)
				? this._vp.w - pad : ds.w;

			props['height'] = ds.h = (ds.h + pad >= this._vp.h || this.sizeToViewport)
				? this._vp.h - pad : ds.h;

			this._sizing = dojox.fx.sizeTo(props);
			this._sizingConnect = this.connect(this._sizing,"onEnd","_showContent");
			this._sizing.play();

		},

		_showContent: function(e){
			// summary:
			//		Show the inner container after sizing animation

			var container = this.containerNode;
			dojo.style(this.domNode, {
				overflow: "visible",
				opacity: 1
			});
			dojo.style(this.closeButtonNode,"opacity",1);
			dojo.style(container, {
				height: this._displaysize.h - this.titleNode.offsetHeight + "px",
				width: this._displaysize.w + "px",
				overflow:"auto"
			});
			dojo.anim(container, { opacity:1 });
		}

	});

	return dojox.widget.Dialog;

});

