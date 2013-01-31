define([
	"dojo/_base/lang",
	"../_base",
	"../utils/date"
], function(lang,dd,ddud){

	lang.getObject("dojox.dtl.tag.date", true);

	dojox.dtl.tag.date.NowNode = function(format, node){
		this._format = format;
		this.format = new ddud.DateFormat(format);
		this.contents = node;
	};
	lang.extend(dd.tag.date.NowNode, {
		render: function(context, buffer){
			this.contents.set(this.format.format(new Date()));
			return this.contents.render(context, buffer);
		},
		unrender: function(context, buffer){
			return this.contents.unrender(context, buffer);
		},
		clone: function(buffer){
			return new this.constructor(this._format, this.contents.clone(buffer));
		}
	});

	dojox.dtl.tag.date.now = function(parser, token){
		// Split by either :" or :'
		var parts = token.split_contents();
		if(parts.length != 2){
			throw new Error("'now' statement takes one argument");
		}
		return new dojox.dtl.tag.date.NowNode(parts[1].slice(1, -1), parser.create_text_node());
	};
	return dojox.dtl.tag.date;
});
