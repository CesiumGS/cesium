define([
	"dojo/_base/lang",
	"dojo/_base/connect",	// dojo.connect
	"dojo/dom-style",	// dojo.style
	"dojo/_base/fx",
	"dojo/fx",
	"dojo/_base/html",
	"dojox/html/ext-dojo/style",
	"dojox/fx/ext-dojo/complex"],
function(lang,connectUtil,domStyle,baseFx,coreFx,htmlUtil,htmlStyleExt,complexFx){
	var css3fx = lang.getObject("dojox.css3.fx", true);

	var css3fxFunctions = {
		// summary:
		//		Utilities for animation effects.
		
		puff: function(/*Object*/args){
			// summary:
			//		Returns an animation that will do a "puff" effect on the given node.
			//
			// description:
			//		Fades out an element and scales it to args.endScale.
			//
			return coreFx.combine([baseFx.fadeOut(args),
				this.expand({
					node: args.node,
					endScale: args.endScale || 2
				})
			]);
		},

		expand: function(/*Object*/args){
			// summary:
			//		Returns an animation that expands args.node.
			//
			// description:
			//		Scales an element to args.endScale.
			//
			return baseFx.animateProperty({
				node: args.node,
				properties: {
					transform: { start: "scale(1)", end: "scale(" + [args.endScale || 3] + ")" }
				}
			});
		},

		shrink: function(/*Object*/args){
			// summary:
			//		Returns an animation that shrinks args.node.
			//
			// description:
			//		Shrinks an element, same as expand({ node: node, endScale: .01 });
			//
			return this.expand({
				node: args.node,
				endScale: .01
			});
		},

		rotate: function(/*Object*/args){
			// summary:
			//		Returns an animation that rotates an element.
			//
			// description:
			//		Rotates an element from args.startAngle to args.endAngle.
			//
			return baseFx.animateProperty({
				node: args.node,
				duration: args.duration || 1000,
				properties: {
					transform: { start: "rotate(" + (args.startAngle || "0deg") + ")", end: "rotate(" + (args.endAngle || "360deg") + ")" }
				}
			});
		},

		flip: function(/*Object*/args){
			// summary:
			//		Returns an animation that flips an element around his y axis.
			//
			// description:
			//		Flips an element around his y axis. The default is a 360deg flip
			//		but it is possible to run a partial flip using args.whichAnims.
			//
			// example:
			//	|	// half flip
			//	|	dojox.css3.fx.flip({
			//	|		node: domNode,
			//	|		whichAnim: [0, 1]
			//	|	}).play();
			//
			var anims = [],
				whichAnims = args.whichAnims || [0, 1, 2, 3],
					direction = args.direction || 1,
				transforms = [
					{ start: "scale(1, 1) skew(0deg,0deg)", end: "scale(0, 1) skew(0," + (direction * 30) + "deg)" },
					{ start: "scale(0, 1) skew(0deg," + (direction * 30) + "deg)", end: "scale(-1, 1) skew(0deg,0deg)" },
					{ start: "scale(-1, 1) skew(0deg,0deg)", end: "scale(0, 1) skew(0deg," + (-direction * 30) + "deg)" },
					{ start: "scale(0, 1) skew(0deg," + (-direction * 30) + "deg)", end: "scale(1, 1) skew(0deg,0deg)" }
			];
			for(var i = 0; i < whichAnims.length; i++){
				anims.push(baseFx.animateProperty(
					lang.mixin({
					node: args.node,
					duration: args.duration || 600,
					properties: {
						transform: transforms[whichAnims[i]]
					}}, args)
				));
			}
			return coreFx.chain(anims);
		},

		bounce: function(/*Object*/args){
			// summary:
			//		Returns an animation that does a "bounce" effect on args.node.
			//
			// description:
			//		Vertical bounce animation. The scaleX, scaleY deformation and the
			//		jump height (args.jumpHeight) can be specified.
			//
			var anims = [],
				n = args.node,
				duration = args.duration || 1000,
				scaleX = args.scaleX || 1.2,
				scaleY = args.scaleY || .6,
				ds = htmlUtil.style,
				oldPos = ds(n, "position"),
				newPos = "absolute",
				oldTop = ds(n, "top"),
				combinedAnims = [],
				bTime = 0,
				round = Math.round,
				jumpHeight = args.jumpHeight || 70
			;
			if(oldPos !== "absolute"){
				newPos = "relative";
			}
			var a1 = baseFx.animateProperty({
				node: n,
				duration: duration / 6,
				properties: {
					transform: { start: "scale(1, 1)", end: "scale(" + scaleX + ", " + scaleY + ")" }
				}
			});
			connectUtil.connect(a1, "onBegin", function(){
				ds(n, {
					transformOrigin: "50% 100%",
					position: newPos
				});
			});
			anims.push(a1);
			var a2 = baseFx.animateProperty({
				node: n,
				duration: duration / 6,
				properties: {
					transform: { end: "scale(1, 1)", start: "scale(" + scaleX + ", " + scaleY + ")" }
				}
			});
			combinedAnims.push(a2);
			combinedAnims.push(new baseFx.Animation(lang.mixin({
				curve: [],
				duration: duration / 3,
				delay: duration / 12,
				onBegin: function(){
					bTime = (new Date).getTime();
				},
				onAnimate: function(){
					var cTime = (new Date).getTime();
					ds(n, {
						top: parseInt(ds(n, "top")) - round(jumpHeight*((cTime-bTime)/this.duration)) + "px"
					});
					bTime = cTime;
				}
			}, args)));
			anims.push(coreFx.combine(combinedAnims));
			anims.push(baseFx.animateProperty(lang.mixin({
				duration: duration / 3,
				onEnd: function(){
					ds(n, {
						position: oldPos
					});
				},
				properties:{
					top: oldTop
				}
			}, args)));
			anims.push(a1);
			anims.push(a2);

			return coreFx.chain(anims);
		}
	};
	
	/*=====
	return css3fxFunctions;
	 =====*/
	return lang.mixin(css3fx, css3fxFunctions);
});
