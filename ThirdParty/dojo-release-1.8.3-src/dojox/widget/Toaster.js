define([
	"dojo/_base/declare", // declare
        "dojo/_base/lang", // lang.getObject...
	"dojo/_base/connect", // connect.connect, connect.subscribe
	"dojo/_base/fx", // fx.fadeOut
        "dojo/dom-style", // domStyle.set
	"dojo/dom-class", // domClass.add
	"dojo/dom-geometry", // domGeometry.getMarginBox
	"dijit/registry",    // registry.getUniqueId()
	"dijit/_WidgetBase",
	"dijit/_TemplatedMixin",
	"dijit/BackgroundIframe",
	"dojo/fx",
	"dojo/has",
	"dojo/_base/window",
	"dojo/window"
], function(declare, lang, connect, baseFx, domStyle, domClass, domGeometry, registry, WidgetBase, Templated, BackgroundIframe, coreFx, has, baseWindow, window){

	lang.getObject("dojox.widget", true);
	
	var capitalize = function(/* String */w){
	    return w.substring(0,1).toUpperCase() + w.substring(1);
	};

	return declare("dojox.widget.Toaster", [WidgetBase, Templated], {
		// summary:
		//		Message that slides in from the corner of the screen, used for notifications
		//		like "new email".

		templateString: '<div class="dijitToasterClip" dojoAttachPoint="clipNode"><div class="dijitToasterContainer" dojoAttachPoint="containerNode" dojoAttachEvent="onclick:onSelect"><div class="dijitToasterContent" dojoAttachPoint="contentNode"></div></div></div>',

		// messageTopic: String
		//		Name of topic; anything published to this topic will be displayed as a message.
		//		Message format is either String or an object like
		//		{message: "hello word", type: "error", duration: 500}
		messageTopic: "",

		// messageTypes: Enumeration
		//		Possible message types.
		messageTypes: {
			MESSAGE: "message",
			WARNING: "warning",
			ERROR: "error",
			FATAL: "fatal"
		},

		// defaultType: String
		//		If message type isn't specified (see "messageTopic" parameter),
		//		then display message as this type.
		//		Possible values in messageTypes enumeration ("message", "warning", "error", "fatal")
		defaultType: "message",

		// positionDirection: String
		//		Position from which message slides into screen, one of
		//		["br-up", "br-left", "bl-up", "bl-right", "tr-down", "tr-left", "tl-down", "tl-right"]
		positionDirection: "br-up",

		// positionDirectionTypes: Array
		//		Possible values for positionDirection parameter
		positionDirectionTypes: ["br-up", "br-left", "bl-up", "bl-right", "tr-down", "tr-left", "tl-down", "tl-right"],

		// duration: Integer
		//		Number of milliseconds to show message
		duration: 2000,

		// slideDuration: Integer
		//		Number of milliseconds for the slide animation, increasing will cause the Toaster
		//		to slide in more slowly.
		slideDuration: 500,

		// separator: String
		//		String used to separate messages if consecutive calls are made to setContent before previous messages go away
		separator: "<hr></hr>",

		postCreate: function(){
			this.inherited(arguments);
			this.hide();

			// place node as a child of body for positioning
			baseWindow.body().appendChild(this.domNode);

			if(this.messageTopic){
				connect.subscribe(this.messageTopic, this, "_handleMessage");
			}
		},

		_handleMessage: function(/*String|Object*/message){
			if(lang.isString(message)){
				this.setContent(message);
			}else{
				this.setContent(message.message, message.type, message.duration);
			}
		},

		setContent: function(/*String|Function*/message, /*String*/messageType, /*int?*/duration){
			// summary:
			//		sets and displays the given message and show duration
			// message:
			//		the message. If this is a function, it will be called with this toaster widget as the only argument.
			// messageType:
			//		type of message; possible values in messageTypes enumeration ("message", "warning", "error", "fatal")
			// duration:
			//		duration in milliseconds to display message before removing it. Widget has default value.
			duration = duration||this.duration;
			// sync animations so there are no ghosted fades and such
			if(this.slideAnim){
				if(this.slideAnim.status() != "playing"){
					this.slideAnim.stop();
				}
				if(this.slideAnim.status() == "playing" || (this.fadeAnim && this.fadeAnim.status() == "playing")){
					setTimeout(lang.hitch(this, function(){
						this.setContent(message, messageType, duration);
					}), 50);
					return;
				}
			}

			// determine type of content and apply appropriately
			for(var type in this.messageTypes){
				domClass.remove(this.containerNode, "dijitToaster" + capitalize(this.messageTypes[type]));
			}

			domStyle.set(this.containerNode, "opacity", 1);

			this._setContent(message);

			domClass.add(this.containerNode, "dijitToaster" + capitalize(messageType || this.defaultType));

			// now do funky animation of widget appearing from
			// bottom right of page and up
			this.show();
			var nodeSize = domGeometry.getMarginBox(this.containerNode);
			this._cancelHideTimer();
			if(this.isVisible){
				this._placeClip();
				//update hide timer if no sticky message in stack
				if(!this._stickyMessage) {
					this._setHideTimer(duration);
				}
			}else{
				var style = this.containerNode.style;
				var pd = this.positionDirection;
				// sets up initial position of container node and slide-out direction
				if(pd.indexOf("-up") >= 0){
					style.left=0+"px";
					style.top=nodeSize.h + 10 + "px";
				}else if(pd.indexOf("-left") >= 0){
					style.left=nodeSize.w + 10 +"px";
					style.top=0+"px";
				}else if(pd.indexOf("-right") >= 0){
					style.left = 0 - nodeSize.w - 10 + "px";
					style.top = 0+"px";
				}else if(pd.indexOf("-down") >= 0){
					style.left = 0+"px";
					style.top = 0 - nodeSize.h - 10 + "px";
				}else{
					throw new Error(this.id + ".positionDirection is invalid: " + pd);
				}
				this.slideAnim = coreFx.slideTo({
					node: this.containerNode,
					top: 0, left: 0,
					duration: this.slideDuration});
				this.connect(this.slideAnim, "onEnd", function(nodes, anim){
						//we build the fadeAnim here so we dont have to duplicate it later
						// can't do a fadeHide because we're fading the
						// inner node rather than the clipping node
						this.fadeAnim = baseFx.fadeOut({
							node: this.containerNode,
							duration: 1000});
						this.connect(this.fadeAnim, "onEnd", function(evt){
							this.isVisible = false;
							this.hide();
						});
						this._setHideTimer(duration);
						this.connect(this, 'onSelect', function(evt){
							this._cancelHideTimer();
							//force clear sticky message
							this._stickyMessage=false;
							this.fadeAnim.play();
						});

						this.isVisible = true;
					});
				this.slideAnim.play();
			}
		},

		_setContent: function(message){
			if(lang.isFunction(message)){
				message(this);
				return;
			}
			if(message && this.isVisible){
				message = this.contentNode.innerHTML + this.separator + message;
			}
			this.contentNode.innerHTML = message;
		},
		_cancelHideTimer:function(){
			if (this._hideTimer){
				clearTimeout(this._hideTimer);
				this._hideTimer=null;
			}
		},

		_setHideTimer:function(duration){
			this._cancelHideTimer();
			//if duration == 0 we keep the message displayed until clicked
			if(duration>0){
				this._cancelHideTimer();
				this._hideTimer=setTimeout(lang.hitch(this, function(evt){
					// we must hide the iframe in order to fade
					// TODO: figure out how to fade with a BackgroundIframe
					if(this.bgIframe && this.bgIframe.iframe){
						this.bgIframe.iframe.style.display="none";
					}
					this._hideTimer=null;
					//force clear sticky message
					this._stickyMessage=false;
					this.fadeAnim.play();
				}), duration);
			}
			else
				this._stickyMessage=true;
		},

		_placeClip: function(){
			var view = window.getBox();

			var nodeSize = domGeometry.getMarginBox(this.containerNode);

			var style = this.clipNode.style;
			// sets up the size of the clipping node
			style.height = nodeSize.h+"px";
			style.width = nodeSize.w+"px";

			// sets up the position of the clipping node
			var pd = this.positionDirection;
			if(pd.match(/^t/)){
				style.top = view.t+"px";
			}else if(pd.match(/^b/)){
				style.top = (view.h - nodeSize.h - 2 + view.t)+"px";
			}
			if(pd.match(/^[tb]r-/)){
				style.left = (view.w - nodeSize.w - 1 - view.l)+"px";
			}else if(pd.match(/^[tb]l-/)){
				style.left = 0 + "px";
			}

			style.clip = "rect(0px, " + nodeSize.w + "px, " + nodeSize.h + "px, 0px)";
			if(has("ie")){
				if(!this.bgIframe){
					this.clipNode.id = registry.getUniqueId("dojox_widget_Toaster_clipNode");
					this.bgIframe = new BackgroundIframe(this.clipNode);
				}
				var iframe = this.bgIframe.iframe;
				if(iframe){ iframe.style.display="block"; }
			}
		},

		onSelect: function(/*Event*/e){
			// summary:
			//		callback for when user clicks the message
		},

		show: function(){
			// summary:'
			//		show the Toaster
			domStyle.set(this.domNode, 'display', 'block');

			this._placeClip();

			if(!this._scrollConnected){
				this._scrollConnected = connect.connect(window, "onscroll", this, this._placeClip);
			}
		},

		hide: function(){
			// summary:
			//		hide the Toaster

			domStyle.set(this.domNode, 'display', 'none');

			if(this._scrollConnected){
				connect.disconnect(this._scrollConnected);
				this._scrollConnected = false;
			}

			domStyle.set(this.containerNode, "opacity", 1);
		}
	});

});
