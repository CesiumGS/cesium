define([
	"./router/RouterBase"
], function(RouterBase){

	// module:
	//		dojo/router

/*=====
return {
	// summary:
	//		A singleton-style instance of dojo/router/RouterBase. See that
	//		module for specifics.
	// example:
	//	|	router.register("/widgets/:id", function(evt){
	//	|		// If "/widgets/3" was matched,
	//	|		// evt.params.id === "3"
	//	|		xhr.get({
	//	|			url: "/some/path/" + evt.params.id,
	//	|			load: function(data){
	//	|				// ...
	//	|			}
	//	|		});
	//	|	});
};
=====*/

	return new RouterBase({});
});
