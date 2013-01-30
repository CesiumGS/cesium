define(['dojo', 'dijit', 'dijit/_Widget', 'dijit/_TemplatedMixin'],function(dojo, dijit, _Widget, _TemplatedMixin){

dojo.experimental("dojox.av.widget.Player");

return dojo.declare("dojox.av.widget.Player", [_Widget, _TemplatedMixin], {
	// summary:
	//		A Media Player UI widget for all types of dojox.av and AIR media.
	// description:
	//		Currently for markup only. All controls should reside as child
	//		nodes within the Player node. 'controlType' is used to determine
	//		the placement of the control. If no type or an unrecognized type
	//		is used, it will be left-aligned in the same row as the volume.
	//
	//		Note:
	//		Be sure to use 'controlType' as a node attribute. It is not a
	//		property of the widget.
	// example:
	//		|	<div dojoType="dojox.av.widget.Player" playerWidth="100%">
    //		| 		<div controlType="video" initialVolume=".1"
	//		| 			mediaUrl="video/Grog.flv" autoPlay="true"
	//		|			isDebug="false" dojoType="dojox.av.FLVideo"></div>
    //		|     	<div controlType="play" dojoType="dojox.av.widget.PlayButton"></div>
    //		|     	<div controlType="volume" dojoType="dojox.av.widget.VolumeButton"></div>
    //		|     	<div controlType="progress" dojoType="dojox.av.widget.ProgressSlider"></div>
    //		|     	<div controlType="status" dojoType="dojox.av.widget.Status"></div>
    //		| </div>

	// playerWidth: Number|String
	//		Sets the width of the player (not the video size)
	//		Number will be converted to pixels
	//		String will be used literally. EX: "320px" or "100%"
	playerWidth: "480px",

	// TODO:
	//playerHeight
	//videoWidth: 320,
	//videoHeight: 240,

	widgetsInTemplate:true,
	templateString: dojo.cache("dojox.av.widget","resources/Player.html"),

	_fillContent: function(){
		// summary:
		//		Finding and collecting child nodes
		if(!this.items && this.srcNodeRef){
			this.items = [];
			var nodes = dojo.query("*", this.srcNodeRef);
			dojo.forEach(nodes, function(n){
				this.items.push(n);
			}, this);
		}
	},

	postCreate: function(){
		// summary:
		//		Do player styling, and place child widgets in the proper location.

		dojo.style(this.domNode, "width", this.playerWidth+(dojo.isString(this.playerWidth)?"":"px"));

		if(dojo.isString(this.playerWidth) && this.playerWidth.indexOf("%")){
			dojo.connect(window, "resize", this, "onResize");
		}
		this.children = [];
		var domNode;
		dojo.forEach(this.items, function(n, i){
			n.id = dijit.getUniqueId("player_control");
			switch(dojo.attr(n, "controlType")){
				case "play":
					this.playContainer.appendChild(n); break;
				case "volume" :
					this.controlsBottom.appendChild(n);	break;
				case "status" :
					this.statusContainer.appendChild(n);	break;
				case "progress":
				case "slider":
					this.progressContainer.appendChild(n);	break;
				case "video":
					this.mediaNode = n;
					this.playerScreen.appendChild(n);	break;
				default:

			}
			this.items[i] = n.id;
		}, this);

	},
	startup: function(){
		// summary:
		//		Fired when all children are ready. Set the media in
		//		all children with setMedia()

		this.media = dijit.byId(this.mediaNode.id);
		if(!dojo.isAIR){
			dojo.style(this.media.domNode, "width", "100%");
			dojo.style(this.media.domNode, "height", "100%");
		}
		dojo.forEach(this.items, function(id){
			if(id !== this.mediaNode.id){
				var child = dijit.byId(id);
				this.children.push(child);
				if(child){
					child.setMedia(this.media, this);
				}
			}
		}, this);
	},

	onResize: function(evt){
		// summary:
		//		If a player size is a percentage, this will fire an onResize
		//		event for all children, passing the size of the player.

		var dim = dojo.marginBox(this.domNode);
		if(this.media && this.media.onResize !== null){
			this.media.onResize(dim);
		}
		dojo.forEach(this.children, function(child){
			if(child.onResize){
				child.onResize(dim);
			}
		});
	}

});

});
