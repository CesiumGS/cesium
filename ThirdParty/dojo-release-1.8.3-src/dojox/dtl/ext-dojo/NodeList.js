define([
	"dojo/_base/lang",
	"dojo/query",
	"../_base"
], function(lang, query, dd){
	var nl = lang.getObject("dojox.dtl.ext-dojo.NodeList", true);

	var NodeList = query.NodeList;

	lang.extend(NodeList, {
		dtl: function(template, context){
			// summary:
			//		Renders the specified template in each of the NodeList entries.
			// template: dojox/dtl/__StringArgs|String
			//		The template string or location
			// context: dojox/dtl/__ObjectArgs|Object
			//		The context object or location
			var d = dd, self = this;
			
			var render = function(template, context){
				var content = template.render(new d._Context(context));
				self.forEach(function(node){
					node.innerHTML = content;
				});
			};

			d.text._resolveTemplateArg(template).addCallback(function(templateString){
				template = new d.Template(templateString);
				d.text._resolveContextArg(context).addCallback(function(context){
					render(template, context);
				});
			});

			return this;
		}
	});
	return NodeList;
});