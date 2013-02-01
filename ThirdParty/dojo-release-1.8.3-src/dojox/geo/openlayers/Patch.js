define([
	"dojo/_base/kernel",
	"dojo/_base/lang",	// dojo.extend getObject
	"dojo/_base/sniff",	// dojo.isIE
	"dojox/gfx",
	"dojox/gfx/shape"
], function(dojo, lang, sniff, gfx, shape){

	var dgo = lang.getObject("geo.openlayers", true, dojox);

	dgo.Patch = {

		patchMethod: function(/*Object*/type, /*String*/method, /*Function*/execBefore, /*Function*/
		execAfter){
			// summary:
			//		Patches the specified method of the given type so that the 'execBefore' (resp. 'execAfter') function is 
			//		called before (resp. after) invoking the legacy implementation.
			// description:
			//		The execBefore function is invoked with the following parameter:
			//		execBefore(method, arguments) where 'method' is the patched method name and 'arguments' the arguments received
			//		by the legacy implementation.
			//		The execAfter function is invoked with the following parameter:
			//		execBefore(method, returnValue, arguments) where 'method' is the patched method name, 'returnValue' the value
			//		returned by the legacy implementation and 'arguments' the arguments received by the legacy implementation.
			// type: Object
			//		the type to patch.
			// method: String
			//		the method name.
			// execBefore: Function
			//		the function to execute before the legacy implementation.
			// execAfter: Function
			//		the function to execute after the legacy implementation.
			// tags:
			//		private
			var old = type.prototype[method];
			type.prototype[method] = function(){
				var callee = method;
				if(execBefore){
					execBefore.call(this, callee, arguments);
				}
				var ret = old.apply(this, arguments);
				if(execAfter){
					ret = execAfter.call(this, callee, ret, arguments) || ret;
				}
				return ret;
			};
		},

		patchGFX: function(){

			var vmlFixRawNodePath = function(){
				if(!this.rawNode.path){
					this.rawNode.path = {};
				}
			};

			var vmlFixFillColors = function(){
				if(this.rawNode.fill && !this.rawNode.fill.colors){
					this.rawNode.fill.colors = {};
				}
			};
			
			if(sniff.isIE <= 8 && gfx.renderer === "vml"){
				this.patchMethod(gfx.Line, "setShape", vmlFixRawNodePath, null);
				this.patchMethod(gfx.Polyline, "setShape", vmlFixRawNodePath, null);
				this.patchMethod(gfx.Path, "setShape", vmlFixRawNodePath, null);
				
				this.patchMethod(shape.Shape, "setFill", vmlFixFillColors, null);
			}
		}
	};
	return dgo.Patch;
});
