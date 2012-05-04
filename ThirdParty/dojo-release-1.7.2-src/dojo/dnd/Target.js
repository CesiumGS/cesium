define([ "./Source" ], function(Source){
	/*===== Source = dojo.dnd.Source =====*/
	return dojo.declare("dojo.dnd.Target", Source, {
		// summary: a Target object, which can be used as a DnD target

		constructor: function(node, params){
			// summary:
			//		a constructor of the Target --- see the `dojo.dnd.Source.constructor` for details
			this.isSource = false;
			dojo.removeClass(this.node, "dojoDndSource");
		}
	});
});
