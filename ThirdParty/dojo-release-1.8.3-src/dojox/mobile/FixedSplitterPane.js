define([
	"dojo/_base/kernel",
	"dojo/_base/declare",
	"./Container"
], function(kernel, declare, Container){

	kernel.deprecated("dojox.mobile.FixedSplitterPane is deprecated", "Use dojox.mobile.Container instead", 2.0);

	// module:
	//		dojox/mobile/FixedSplitterPane

	return declare("dojox.mobile.FixedSplitterPane", Container, {
		// summary:
		//		Deprecated widget. Use dojox/mobile/Container instead.

		baseClass: "mblFixedSplitterPane"
	});
});
