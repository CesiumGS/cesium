define(["./query", "./_base/lang", "./aspect", "./_base/fx", "./fx"],
function(query, lang, aspect, baseFx, coreFx){

// module:
//		dojo/NodeList-fx

/*=====
return function(){
	// summary:
	//		Adds dojo.fx animation support to dojo.query() by extending the NodeList class
	//		with additional FX functions.  NodeList is the array-like object used to hold query results.
};
=====*/

var NodeList = query.NodeList;

lang.extend(NodeList, {
	_anim: function(obj, method, args){
		args = args||{};
		var a = coreFx.combine(
			this.map(function(item){
				var tmpArgs = { node: item };
				lang.mixin(tmpArgs, args);
				return obj[method](tmpArgs);
			})
		);
		return args.auto ? a.play() && this : a; // dojo/_base/fx.Animation|dojo/NodeList
	},

	wipeIn: function(args){
		// summary:
		//		wipe in all elements of this NodeList via `dojo/fx.wipeIn()`
		//
		// args: Object?
		//		Additional dojo/_base/fx.Animation arguments to mix into this set with the addition of
		//		an `auto` parameter.
		//
		// returns: dojo/_base/fx.Animation|dojo/NodeList
		//		A special args member `auto` can be passed to automatically play the animation.
		//		If args.auto is present, the original dojo/NodeList will be returned for further
		//		chaining. Otherwise the dojo/_base/fx.Animation instance is returned and must be .play()'ed
		//
		// example:
		//		Fade in all tables with class "blah":
		//		|	require(["dojo/query", "dojo/NodeList-fx"
		//		|	], function(query){
		//		|		query("table.blah").wipeIn().play();
		//		|	});
		//
		// example:
		//		Utilizing `auto` to get the NodeList back:
		//		|	require(["dojo/query", "dojo/NodeList-fx"
		//		|	], function(query){
		//		|		query(".titles").wipeIn({ auto:true }).onclick(someFunction);
		//		|	});
		//
		return this._anim(coreFx, "wipeIn", args); // dojo/_base/fx.Animation|dojo/NodeList
	},

	wipeOut: function(args){
		// summary:
		//		wipe out all elements of this NodeList via `dojo/fx.wipeOut()`
		//
		// args: Object?
		//		Additional dojo/_base/fx.Animation arguments to mix into this set with the addition of
		//		an `auto` parameter.
		//
		// returns: dojo/_base/fx.Animation|dojo/NodeList
		//		A special args member `auto` can be passed to automatically play the animation.
		//		If args.auto is present, the original dojo/NodeList will be returned for further
		//		chaining. Otherwise the dojo/_base/fx.Animation instance is returned and must be .play()'ed
		//
		// example:
		//		Wipe out all tables with class "blah":
		//		|	require(["dojo/query", "dojo/NodeList-fx"
		//		|	], function(query){
		//		|		query("table.blah").wipeOut().play();
		//		|	});		
		return this._anim(coreFx, "wipeOut", args); // dojo/_base/fx.Animation|dojo/NodeList
	},

	slideTo: function(args){
		// summary:
		//		slide all elements of the node list to the specified place via `dojo/fx.slideTo()`
		//
		// args: Object?
		//		Additional dojo/_base/fx.Animation arguments to mix into this set with the addition of
		//		an `auto` parameter.
		//
		// returns: dojo/_base/fx.Animation|dojo/NodeList
		//		A special args member `auto` can be passed to automatically play the animation.
		//		If args.auto is present, the original dojo/NodeList will be returned for further
		//		chaining. Otherwise the dojo/_base/fx.Animation instance is returned and must be .play()'ed
		//
		// example:
		//		|	Move all tables with class "blah" to 300/300:
		//		|	require(["dojo/query", "dojo/NodeList-fx"
		//		|	], function(query){
		//		|		query("table.blah").slideTo({
		//		|			left: 40,
		//		|			top: 50
		//		|		}).play();
		//		|	});
		return this._anim(coreFx, "slideTo", args); // dojo/_base/fx.Animation|dojo/NodeList
	},


	fadeIn: function(args){
		// summary:
		//		fade in all elements of this NodeList via `dojo.fadeIn`
		//
		// args: Object?
		//		Additional dojo/_base/fx.Animation arguments to mix into this set with the addition of
		//		an `auto` parameter.
		//
		// returns: dojo/_base/fx.Animation|dojo/NodeList
		//		A special args member `auto` can be passed to automatically play the animation.
		//		If args.auto is present, the original dojo/NodeList will be returned for further
		//		chaining. Otherwise the dojo/_base/fx.Animation instance is returned and must be .play()'ed
		//
		// example:
		//		Fade in all tables with class "blah":
		//		|	require(["dojo/query", "dojo/NodeList-fx"
		//		|	], function(query){
		//		|		query("table.blah").fadeIn().play();
		//		|	});
		return this._anim(baseFx, "fadeIn", args); // dojo/_base/fx.Animation|dojo/NodeList
	},

	fadeOut: function(args){
		// summary:
		//		fade out all elements of this NodeList via `dojo.fadeOut`
		//
		// args: Object?
		//		Additional dojo/_base/fx.Animation arguments to mix into this set with the addition of
		//		an `auto` parameter.
		//
		// returns: dojo/_base/fx.Animation|dojo/NodeList
		//		A special args member `auto` can be passed to automatically play the animation.
		//		If args.auto is present, the original dojo/NodeList will be returned for further
		//		chaining. Otherwise the dojo/_base/fx.Animation instance is returned and must be .play()'ed
		//
		// example:
		//		Fade out all elements with class "zork":
		//		|	require(["dojo/query", "dojo/NodeList-fx"
		//		|	], function(query){
		//		|		query(".zork").fadeOut().play();
		//		|	});
		// example:
		//		Fade them on a delay and do something at the end:
		//		|	require(["dojo/query", "dojo/aspect", "dojo/NodeList-fx"
		//		|	], function(query, aspect){
		//		|		var fo = query(".zork").fadeOut();
		//		|		aspect.after(fo, "onEnd", function(){ /*...*/ }, true);
		//		|		fo.play();
		//		|	});
		// example:
		//		Using `auto`:
		//		|	require(["dojo/query", "dojo/NodeList-fx"
		//		|	], function(query){
		//		|		query("li").fadeOut({ auto:true }).filter(filterFn).forEach(doit);
		//		|	});
		//
		return this._anim(baseFx, "fadeOut", args); // dojo/_base/fx.Animation|dojo/NodeList
	},

	animateProperty: function(args){
		// summary:
		//		Animate all elements of this NodeList across the properties specified.
		//		syntax identical to `dojo.animateProperty`
		//
		// args: Object?
		//		Additional dojo/_base/fx.Animation arguments to mix into this set with the addition of
		//		an `auto` parameter.
		//
		// returns: dojo/_base/fx.Animation|dojo/NodeList
		//		A special args member `auto` can be passed to automatically play the animation.
		//		If args.auto is present, the original dojo/NodeList will be returned for further
		//		chaining. Otherwise the dojo/_base/fx.Animation instance is returned and must be .play()'ed
		//
		// example:
		//	|	require(["dojo/query", "dojo/NodeList-fx"
		//	|	], function(query){
		//	|		query(".zork").animateProperty({
		//	|			duration: 500,
		//	|			properties: {
		//	|				color:		{ start: "black", end: "white" },
		//	|				left:		{ end: 300 }
		//	|			}
		//	|		}).play();
		//	|	});
		//
		// example:
		//	|	require(["dojo/query", "dojo/NodeList-fx"
		//	|	], function(query){
		//	|		query(".grue").animateProperty({
		//	|			auto:true,
		//	|			properties: {
		//	|				height:240
		//	|			}
		//	|		}).onclick(handler);
		//	|	});
		return this._anim(baseFx, "animateProperty", args); // dojo/_base/fx.Animation|dojo/NodeList
	},

	anim: function( /*Object*/			properties,
					/*Integer?*/		duration,
					/*Function?*/		easing,
					/*Function?*/		onEnd,
					/*Integer?*/		delay){
		// summary:
		//		Animate one or more CSS properties for all nodes in this list.
		//		The returned animation object will already be playing when it
		//		is returned. See the docs for `dojo.anim` for full details.
		// properties: Object
		//		the properties to animate. does NOT support the `auto` parameter like other
		//		NodeList-fx methods.
		// duration: Integer?
		//		Optional. The time to run the animations for
		// easing: Function?
		//		Optional. The easing function to use.
		// onEnd: Function?
		//		A function to be called when the animation ends
		// delay:
		//		how long to delay playing the returned animation
		// example:
		//		Another way to fade out:
		//	|	require(["dojo/query", "dojo/NodeList-fx"
		//	|	], function(query){
		//	|		query(".thinger").anim({ opacity: 0 });
		//	|	});
		// example:
		//		animate all elements with the "thigner" class to a width of 500
		//		pixels over half a second
		//	|	require(["dojo/query", "dojo/NodeList-fx"
		//	|	], function(query){
		//	|		query(".thinger").anim({ width: 500 }, 700);
		//	|	});
		var canim = coreFx.combine(
			this.map(function(item){
				return baseFx.animateProperty({
					node: item,
					properties: properties,
					duration: duration||350,
					easing: easing
				});
			})
		);
		if(onEnd){
			aspect.after(canim, "onEnd", onEnd, true);
		}
		return canim.play(delay||0); // dojo/_base/fx.Animation
	}
});

return NodeList;
});
