define(["./query", "./_base/lang", "./html"], function(query, lang, html){

// module:
//		dojo/NodeList-html

/*=====
return function(){
	// summary:
	//		Adds a chainable html method to dojo/query() / NodeList instances for setting/replacing node content
};
=====*/

var NodeList = query.NodeList;


lang.extend(NodeList, {
	html: function(/* String|DomNode|NodeList? */ content, /* Object? */params){
		// summary:
		//		see `dojo/html.set()`. Set the content of all elements of this NodeList
		//
		// content:
		//		An html string, node or enumerable list of nodes for insertion into the dom
		//
		// params:
		//		Optional flags/properties to configure the content-setting. See dojo/html._ContentSetter
		//
		// description:
		//		Based around `dojo/html.set()`, set the content of the Elements in a
		//		NodeList to the given content (string/node/nodelist), with optional arguments
		//		to further tune the set content behavior.
		//
		// example:
		//	|	require(["dojo/query", "dojo/NodeList-html"
		//	|	], function(query){
		//	| 		query(".thingList").html("<li data-dojo-type='dojo/dnd/Moveable'>1</li><li data-dojo-type='dojo/dnd/Moveable'>2</li><li data-dojo-type='dojo/dnd/Moveable'>3</li>",
		//	| 		{
		//	| 			parseContent: true,
		//	| 			onBegin: function(){
		//	| 				this.content = this.content.replace(/([0-9])/g, this.id + ": $1");
		//	| 				this.inherited("onBegin", arguments);
		//	| 			}
		//	|		}).removeClass("notdone").addClass("done");
		//	| 	});

		var dhs = new html._ContentSetter(params || {});
		this.forEach(function(elm){
			dhs.node = elm;
			dhs.set(content);
			dhs.tearDown();
		});
		return this; // dojo/NodeList
	}
});

return NodeList;
});
