define([
	"dojo/_base/array", // array.forEach array.map
	"dojo/aspect",
	"dojo/_base/declare"
], function(array, aspect, declare){

// module:
//		dijit/Destroyable

return declare("dijit.Destroyable", null, {
	// summary:
	//		Mixin to track handles and release them when instance is destroyed.
	// description:
	//		Call this.own(...) on list of handles (returned from dojo/aspect, dojo/on,
	//		dojo/Stateful::watch, or any class (including widgets) with a destroyRecursive() or destroy() method.
	//		Then call destroy() later to destroy this instance and release the resources.

	destroy: function(/*Boolean*/ preserveDom){
		// summary:
		//		Destroy this class, releasing any resources registered via own().
		this._destroyed = true;
	},

	own: function(){
		// summary:
		//		Track specified handles and remove/destroy them when this instance is destroyed, unless they were
		//		already removed/destroyed manually.
		// tags:
		//		protected
		// returns:
		//		The array of specified handles, so you can do for example:
		//	|		var handle = this.own(on(...))[0];

		array.forEach(arguments, function(handle){
			var destroyMethodName =
				"destroyRecursive" in handle ? "destroyRecursive" :	// remove "destroyRecursive" for 2.0
				"destroy" in handle ? "destroy" :
				"remove";

			// When this.destroy() is called, destroy handle.  Since I'm using aspect.before(),
			// the handle will be destroyed before a subclass's destroy() method starts running, before it calls
			// this.inherited() or even if it doesn't call this.inherited() at all.  If that's an issue, make an
			// onDestroy() method and connect to that instead.
			var odh = aspect.before(this, "destroy", function(preserveDom){
				handle[destroyMethodName](preserveDom);
			});

			// If handle is destroyed manually before this.destroy() is called, remove the listener set directly above.
			var hdh = aspect.after(handle, destroyMethodName, function(){
				odh.remove();
				hdh.remove();
			}, true);
		}, this);

		return arguments;		// handle
	}
});

});
