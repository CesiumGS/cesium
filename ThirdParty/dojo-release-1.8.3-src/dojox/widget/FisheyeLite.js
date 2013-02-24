define([
	"dojo/_base/kernel",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/on",
	"dojo/query",
	"dojo/dom-style",
	"dojo/_base/fx",
	"dijit/_WidgetBase",
	"dojo/fx/easing"
	
], function(kernel, declare, lang, on, query, domStyle, fx, _WidgetBase, easing){
	
	lang.getObject("widget", true, dojox);
	kernel.experimental("dojox/widget/FisheyeLite");

	return dojo.declare("dojox.widget.FisheyeLite", [_WidgetBase], {
		// summary:
		//		A Light-weight Fisheye Component, or an exhanced version
		//		of dojo/fx/Toggler ...
		// description:
		//		A Simple FisheyeList-like widget which (in the interest of
		//		performance) relies on well-styled content for positioning,
		//		and natural page layout for rendering.
		//
		//		use position:absolute/relative nodes to prevent layout
		//		changes, and use caution when seleting properties to
		//		scale. Negative scaling works, but some properties
		//		react poorly to being set to negative values, IE being
		//		particularly annoying in that regard.
		//
		//		quirk: uses the domNode as the target of the animation
		//		unless it finds a node class="fisheyeTarget" in the container
		//		being turned into a FisheyeLite instance
		//
		// example:
		//	|	// make all the LI's in a node Fisheye's:
		//	|	require(["dojo/query", "dojox/widget/FisheyeLite"],
		//	|		function(query, FisheyeLite){
		//	|   	query("#node li").forEach(function(n){
		// 	|			new FisheyeLite({},n);
		//	|		});
		//	|	});
		//
		//
		// example:
		//	|	require(["dojox/widget/FisheyeLite"], function(FisheyeLite){
		//	|		new FisheyeLite({
		//	|			properties:{
		//	|				// height is literal, width is multiplied
		//	|				height:{ end: 200 }, width:2.3
		//	|			}
		//	|		}, "someNode");
		//	|	});
		
		// durationIn: Integer
		//		The time (in ms) the run the show animation
		durationIn: 350,

		// easeIn: Function
		//		An easing function to use for the show animation
		easeIn: easing.backOut,

		// durationOut: Integer
		//		The Time (in ms) to run the hide animation
		durationOut: 1420,

		// easeOut: Function
		//		An easing function to use for the hide animation
		easeOut: easing.elasticOut,

		// properties: Object
		//		An object of "property":scale pairs, or "property":{} pairs.
		//		defaults to font-size with a scale of 2.75
		//		If a named property is an integer or float, the "scale multiplier"
		//		is used. If the named property is an object, that object is mixed
		//		into the animation directly. eg: height:{ end:20, units:"em" }
		properties: null,

		// units: String
		//		Sometimes, you need to specify a unit. Should be part of
		//		properties attrib, but was trying to shorthand the logic there
		units:"px",

		constructor: function(props, node){
			this.properties = props.properties || {
				fontSize: 2.75
			}
		},

		postCreate: function(){

			this.inherited(arguments);
			this._target = query(".fisheyeTarget", this.domNode)[0] || this.domNode;
			this._makeAnims();

			this.connect(this.domNode, "onmouseover", "show");
			this.connect(this.domNode, "onmouseout", "hide");
			this.connect(this._target, "onclick", "onClick");

		},

		show: function(){
			// summary:
			//		Show this Fisheye item.
			this._runningOut.stop();
			this._runningIn.play();
		},

		hide: function(){
			// summary:
			//		Hide this fisheye item on mouse leave
			this._runningIn.stop();
			this._runningOut.play();
		},

		_makeAnims: function(){
			// summary:
			//		Pre-generate the animations

			// create two properties: objects, one for each "state"
			var _in = {}, _out = {}, cs = domStyle.getComputedStyle(this._target);
			for(var p in this.properties){
				var prop = this.properties[p],
					deep = lang.isObject(prop),
					v = parseInt(cs[p])
				;
				// note: do not set negative scale for [a list of properties] for IE support
				// note: filter:'s are your own issue, too ;)
				// FIXME: this.units here is bad, likely. d._toPixelValue ?
				_out[p] = { end: v, units:this.units };
				_in[p] = deep ? prop : { end: prop * v, units:this.units };
			}

			this._runningIn = fx.animateProperty({
				node: this._target,
				easing: this.easeIn,
				duration: this.durationIn,
				properties: _in
			});

			this._runningOut = fx.animateProperty({
				node: this._target,
				duration: this.durationOut,
				easing: this.easeOut,
				properties: _out
			});

			this.connect(this._runningIn, "onEnd", lang.hitch(this, "onSelected", this));
		},

		onClick: function(/* Event */e){
			// summary:
			//		stub function fired when target is clicked
			//		connect or override to use.
		},

		onSelected: function(/* Object */e){
			// summary:
			//		stub function fired when Fisheye Item is fully visible and
			//		hovered. connect or override use.
		}

	});
	
});
