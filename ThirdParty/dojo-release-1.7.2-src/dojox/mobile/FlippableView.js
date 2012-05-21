define([
	"dojo/_base/kernel",
	"dojox/mobile/SwapView"
], function(kernel, SwapView){
	kernel.deprecated("dojox.mobile.FlippableView is deprecated", "dojox.mobile.FlippableView moved to dojox.mobile.SwapView", 1.7);
	dojox.mobile.FlippableView = SwapView;
	return SwapView;
});
