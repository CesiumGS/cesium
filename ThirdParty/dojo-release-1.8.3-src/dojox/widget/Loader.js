dojo.provide("dojox.widget.Loader");
dojo.deprecated("dojox.widget.Loader", "", "2.0");

dojo.require("dijit._Widget");
dojo.require("dijit._Templated");

dojo.declare("dojox.widget.Loader", [dijit._Widget,dijit._Templated], {
	// summary:
	//		a configurable global xhr-listener to display
	//		a loading message during running xhr's or to simply provide
	//		base-level topic to subscribe to for custom loading messages

	// loadIcon: String
	// 		location to the icon used.
	loadIcon: dojo.moduleUrl("dojox.widget.Loader","icons/loading.gif"),

	// loadMessage: String
	//		string to use for progress loading
	loadMessage: 'Loading ...',

	// hasVisuals: Boolean
	//		true to display a fixed loading message in TR cornder, false to unly provide
	//		"Loader" topic to subscribe to for your own custom loading message.
	hasVisuals: true,

	// attachToPointer
	//		true to use visual indicator where cursor is
	attachToPointer: true,

	// duration: Integer
	//		time in ms to toggle in/out the visual load indicator
	duration: 125,

	// _offset: Integer
	//		distance in px from the mouse pointer to show attachToPointer avatar
	_offset: 16,

	// holder for mousemove connection
	_pointerConnect: null,
	_xhrStart: null,
	_xhrEnd: null,

	templateString: '<div dojoAttachPoint="loadNode" class="dojoxLoader">'
		+'<img src="${loadIcon}" class="dojoxLoaderIcon"> <span dojoAttachPoint="loadMessageNode" class="dojoxLoaderMessage"></span>'
		+'</div>',
	
	postCreate: function(){
		// summary:
		//		setup the loader

		if(!this.hasVisuals){
			this.loadNode.style.display = "none"; // _destroy()?
		}else{
			if(this.attachToPointer){
				dojo.removeClass(this.loadNode,"dojoxLoader");
				dojo.addClass(this.loadNode,"dojoxLoaderPointer");
			}
			this._hide();
		}
		this._setMessage(this.loadMessage);

		// FIXME: create our connections.  would be easier, and this might be redundant
		// if Deferred published something. XHR published stuff. FIXME to use that.
		this._xhrStart = this.connect(dojo,"_ioSetArgs","_show");
		this._xhrEnd = this.connect(dojo.Deferred.prototype,"_fire","_hide");

	},

	_setMessage: function(/* String */ message){
		// summary:
		//		set's the message in the loader
		this.loadMessageNode.innerHTML = message;
	},

	_putLoader: function(/* Event */ e){
		// summary:
		//		place the floating loading element based on mousemove connection position
		dijit.placeOnScreen(this.loadNode,{ x: e.clientX+this._offset, y:e.clientY+this._offset }, ["TL","BR"]);
	},

	_show: function(){
		// summary:
		//		publish and show progress indicator
		dojo.publish("Loader",[{ message: 'started' }]);
		if(this.hasVisuals){
			if(this.attachToPointer){
				this._pointerConnect = this.connect(document,"onmousemove","_putLoader");
			}
			dojo.style(this.loadNode, {
				opacity:0, display:""
			});
			dojo.fadeIn({ node: this.loadNode, duration:this.duration }).play();
		}
	},

	_hide: function(){
		// summary:
		//		publish "xhr ended" and hide progress indicator
		dojo.publish("Loader",[{ message: 'ended' }]);
		if(this.hasVisuals){
			if(this.attachToPointer){
				this.disconnect(this._pointerConnect);
			}
			dojo.fadeOut({
				node: this.loadNode,
				duration:this.duration,
				onEnd: dojo.partial(dojo.style, this.loadNode, "display", "none")
			}).play();
		}
	}

});
