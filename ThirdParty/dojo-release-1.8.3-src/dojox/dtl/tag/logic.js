define([
	"dojo/_base/lang",
	"../_base"
], function(lang, dd){

	lang.getObject("dojox.dtl.tag.logic", true);

	var ddt = dd.text;
	var ddtl = dd.tag.logic;

	ddtl.IfNode = lang.extend(function(bools, trues, falses, type){
		this.bools = bools;
		this.trues = trues;
		this.falses = falses;
		this.type = type;
	},
	{
		render: function(context, buffer){
			var i, bool, ifnot, filter, value;
			if(this.type == "or"){
				for(i = 0; bool = this.bools[i]; i++){
					ifnot = bool[0];
					filter = bool[1];
					value = filter.resolve(context);
					if((value && !ifnot) || (ifnot && !value)){
						if(this.falses){
							buffer = this.falses.unrender(context, buffer);
						}
						return (this.trues) ? this.trues.render(context, buffer, this) : buffer;
					}
				}
				if(this.trues){
					buffer = this.trues.unrender(context, buffer);
				}
				return (this.falses) ? this.falses.render(context, buffer, this) : buffer;
			}else{
				for(i = 0; bool = this.bools[i]; i++){
					ifnot = bool[0];
					filter = bool[1];
					value = filter.resolve(context);
					// If we ever encounter a false value
					if(value == ifnot){
						if(this.trues){
							buffer = this.trues.unrender(context, buffer);
						}
						return (this.falses) ? this.falses.render(context, buffer, this) : buffer;
					}
				}
				if(this.falses){
					buffer = this.falses.unrender(context, buffer);
				}
				return (this.trues) ? this.trues.render(context, buffer, this) : buffer;
			}
			return buffer;
		},
		unrender: function(context, buffer){
			buffer = (this.trues) ? this.trues.unrender(context, buffer) : buffer;
			buffer = (this.falses) ? this.falses.unrender(context, buffer) : buffer;
			return buffer;
		},
		clone: function(buffer){
			var trues = (this.trues) ? this.trues.clone(buffer) : null;
			var falses = (this.falses) ? this.falses.clone(buffer) : null;
			return new this.constructor(this.bools, trues, falses, this.type);
		}
	});

	ddtl.IfEqualNode = lang.extend(function(var1, var2, trues, falses, negate){
		this.var1 = new dd._Filter(var1);
		this.var2 = new dd._Filter(var2);
		this.trues = trues;
		this.falses = falses;
		this.negate = negate;
	},
	{
		render: function(context, buffer){
			var var1 = this.var1.resolve(context);
			var var2 = this.var2.resolve(context);
			var1 = (typeof var1 != "undefined") ? var1 : "";
			var2 = (typeof var1 != "undefined") ? var2 : "";
			if((this.negate && var1 != var2) || (!this.negate && var1 == var2)){
				if(this.falses){
					buffer = this.falses.unrender(context, buffer, this);
				}
				return (this.trues) ? this.trues.render(context, buffer, this) : buffer;
			}
			if(this.trues){
				buffer = this.trues.unrender(context, buffer, this);
			}
			return (this.falses) ? this.falses.render(context, buffer, this) : buffer;
		},
		unrender: function(context, buffer){
			return ddtl.IfNode.prototype.unrender.call(this, context, buffer);
		},
		clone: function(buffer){
			var trues = this.trues ? this.trues.clone(buffer) : null;
			var falses = this.falses ? this.falses.clone(buffer) : null;
			return new this.constructor(this.var1.getExpression(), this.var2.getExpression(), trues, falses, this.negate);
		}
	});

	ddtl.ForNode = lang.extend(function(assign, loop, reversed, nodelist){
		this.assign = assign;
		this.loop = new dd._Filter(loop);
		this.reversed = reversed;
		this.nodelist = nodelist;
		this.pool = [];
	},
	{
		render: function(context, buffer){
			var i, j, k;
			var dirty = false;
			var assign = this.assign;

			for(k = 0; k < assign.length; k++){
				if(typeof context[assign[k]] != "undefined"){
					dirty = true;
					context = context.push();
					break;
				}
			}
			if(!dirty && context.forloop){
				dirty = true;
				context = context.push();
			}

			var items = this.loop.resolve(context) || [];
			for(i = items.length; i < this.pool.length; i++){
				this.pool[i].unrender(context, buffer, this);
			}
			if(this.reversed){
				items = items.slice(0).reverse();
			}

			var isObject = lang.isObject(items) && !lang.isArrayLike(items);
			var arred = [];
			if(isObject){
				for(var key in items){
					arred.push(items[key]);
				}
			}else{
				arred = items;
			}

			var forloop = context.forloop = {
				parentloop: context.get("forloop", {})
			};
			var j = 0;
			for(i = 0; i < arred.length; i++){
				var item = arred[i];

				forloop.counter0 = j;
				forloop.counter = j + 1;
				forloop.revcounter0 = arred.length - j - 1;
				forloop.revcounter = arred.length - j;
				forloop.first = !j;
				forloop.last = (j == arred.length - 1);

				if(assign.length > 1 && lang.isArrayLike(item)){
					if(!dirty){
						dirty = true;
						context = context.push();
					}
					var zipped = {};
					for(k = 0; k < item.length && k < assign.length; k++){
						zipped[assign[k]] = item[k];
					}
					lang.mixin(context, zipped);
				}else{
					context[assign[0]] = item;
				}

				if(j + 1 > this.pool.length){
					this.pool.push(this.nodelist.clone(buffer));
				}
				buffer = this.pool[j++].render(context, buffer, this);
			}

			delete context.forloop;
			if(dirty){
				context = context.pop();
			}else{
				for(k = 0; k < assign.length; k++){
					delete context[assign[k]];
				}
			}
			return buffer;
		},
		unrender: function(context, buffer){
			for(var i = 0, pool; pool = this.pool[i]; i++){
				buffer = pool.unrender(context, buffer);
			}
			return buffer;
		},
		clone: function(buffer){
			return new this.constructor(this.assign, this.loop.getExpression(), this.reversed, this.nodelist.clone(buffer));
		}
	});

	lang.mixin(ddtl, {
		if_: function(parser, token){
			var i, part, type, bools = [], parts = token.contents.split();
			parts.shift();
			token = parts.join(" ");
			parts = token.split(" and ");
			if(parts.length == 1){
				type = "or";
				parts = token.split(" or ");
			}else{
				type = "and";
				for(i = 0; i < parts.length; i++){
					if(parts[i].indexOf(" or ") != -1){
						// Note, since we split by and, this is the only place we need to error check
						throw new Error("'if' tags can't mix 'and' and 'or'");
					}
				}
			}
			for(i = 0; part = parts[i]; i++){
				var not = false;
				if(part.indexOf("not ") == 0){
					part = part.slice(4);
					not = true;
				}
				bools.push([not, new dd._Filter(part)]);
			}
			var trues = parser.parse(["else", "endif"]);
			var falses = false;
			var token = parser.next_token();
			if(token.contents == "else"){
				falses = parser.parse(["endif"]);
				parser.next_token();
			}
			return new ddtl.IfNode(bools, trues, falses, type);
		},
		_ifequal: function(parser, token, negate){
			var parts = token.split_contents();
			if(parts.length != 3){
				throw new Error(parts[0] + " takes two arguments");
			}
			var end = 'end' + parts[0];
			var trues = parser.parse(["else", end]);
			var falses = false;
			var token = parser.next_token();
			if(token.contents == "else"){
				falses = parser.parse([end]);
				parser.next_token();
			}
			return new ddtl.IfEqualNode(parts[1], parts[2], trues, falses, negate);
		},
		ifequal: function(parser, token){
			return ddtl._ifequal(parser, token);
		},
		ifnotequal: function(parser, token){
			return ddtl._ifequal(parser, token, true);
		},
		for_: function(parser, token){
			var parts = token.contents.split();
			if(parts.length < 4){
				throw new Error("'for' statements should have at least four words: " + token.contents);
			}
			var reversed = parts[parts.length - 1] == "reversed";
			var index = (reversed) ? -3 : -2;
			if(parts[parts.length + index] != "in"){
				throw new Error("'for' tag received an invalid argument: " + token.contents);
			}
			var loopvars = parts.slice(1, index).join(" ").split(/ *, */);
			for(var i = 0; i < loopvars.length; i++){
				if(!loopvars[i] || loopvars[i].indexOf(" ") != -1){
					throw new Error("'for' tag received an invalid argument: " + token.contents);
				}
			}
			var nodelist = parser.parse(["endfor"]);
			parser.next_token();
			return new ddtl.ForNode(loopvars, parts[parts.length + index + 1], reversed, nodelist);
		}
	});
	return dojox.dtl.tag.logic;
});