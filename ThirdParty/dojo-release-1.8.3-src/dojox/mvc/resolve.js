define([
	"dojo/_base/lang",
	"dijit/registry",
	"dojo/Stateful"
], function(lang, registry){
	var resolve = function(/*dojo/Stateful|String*/ target, /*dojo/Stateful?*/ parent){
		// summary:
		//		Find a dojo/Stateful for the target.
		// description:
		//		If target is not a string, return target itself.
		//		If target is "widget:widgetid", returns the widget whose ID is widgetid.
		//		If target is "rel:object.path", or target is other string, returns an object under parent (if specified) or under global scope.
		// target: dojo/Stateful|String
		//		The data binding to resolve.
		// parent: dojo/Stateful?
		//		The parent data binding. Used when the data binding is defined inside repeat.

		if(typeof target == "string"){
			var tokens = target.match(/^(expr|rel|widget):(.*)$/) || [];
			try{
				if(tokens[1] == "rel"){
					target = lang.getObject(tokens[2] || "", false, parent);
				}else if(tokens[1] == "widget"){
					target = registry.byId(tokens[2]);
				}else{
					target = lang.getObject(tokens[2] || target, false, parent);
				}
			}catch(e){}
		}

		return target; // dojo/Stateful
	};

	// lang.setObject() thing is for back-compat, remove it in 2.0
	return lang.setObject("dojox.mvc.resolve", resolve);
});
