define([
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/_base/json",
	"../_base",
	"dojox/string/tokenize"
], function(lang,array,json,dd,Tokenize){

	lang.getObject("dojox.dtl.tag.loop", true);

	var ddtl = dd.tag.loop;

	ddtl.CycleNode = lang.extend(function(cyclevars, name, text, shared){
		this.cyclevars = cyclevars;
		this.name = name;
		this.contents = text;
		this.shared = shared || {counter: -1, map: {}};
	},
	{
		render: function(context, buffer){
			if(context.forloop && !context.forloop.counter0){
				this.shared.counter = -1;
			}

			++this.shared.counter;
			var value = this.cyclevars[this.shared.counter % this.cyclevars.length];

			var map = this.shared.map;
			if(!map[value]){
				map[value] = new dd._Filter(value);
			}
			value = map[value].resolve(context, buffer);

			if(this.name){
				context[this.name] = value;
			}
			this.contents.set(value);
			return this.contents.render(context, buffer);
		},
		unrender: function(context, buffer){
			return this.contents.unrender(context, buffer);
		},
		clone: function(buffer){
			return new this.constructor(this.cyclevars, this.name, this.contents.clone(buffer), this.shared);
		}
	});

	ddtl.IfChangedNode = lang.extend(function(nodes, vars, shared){
		this.nodes = nodes;
		this._vars = vars;
		this.shared = shared || {last: null, counter: 0};
		this.vars = array.map(vars, function(item){
			return new dojox.dtl._Filter(item);
		});
	}, {
		render: function(context, buffer){
			if(context.forloop){
				if(context.forloop.counter <= this.shared.counter){
					this.shared.last = null;
				}
				this.shared.counter = context.forloop.counter;
			}

			var change;
			if(this.vars.length){
				change = json.toJson(array.map(this.vars, function(item){
					return item.resolve(context);
				}));
			}else{
				change = this.nodes.dummyRender(context, buffer);
			}

			if(change != this.shared.last){
				var firstloop = (this.shared.last === null);
				this.shared.last = change;
				context = context.push();
				context.ifchanged = {firstloop: firstloop};
				buffer = this.nodes.render(context, buffer);
				context = context.pop();
			}else{
				buffer = this.nodes.unrender(context, buffer);
			}
			return buffer;
		},
		unrender: function(context, buffer){
			return this.nodes.unrender(context, buffer);
		},
		clone: function(buffer){
			return new this.constructor(this.nodes.clone(buffer), this._vars, this.shared);
		}
	});

	ddtl.RegroupNode = lang.extend(function(expression, key, alias){
		this._expression = expression;
		this.expression = new dd._Filter(expression);
		this.key = key;
		this.alias = alias;
	},
	{
		_push: function(container, grouper, stack){
			if(stack.length){
				container.push({ grouper: grouper, list: stack });
			}
		},
		render: function(context, buffer){
			context[this.alias] = [];
			var list = this.expression.resolve(context);
			if(list){
				var last = null;
				var stack = [];
				for(var i = 0; i < list.length; i++){
					var id = list[i][this.key];
					if(last !== id){
						this._push(context[this.alias], last, stack);
						last = id;
						stack = [list[i]];
					}else{
						stack.push(list[i]);
					}
				}
				this._push(context[this.alias], last, stack);
			}
			return buffer;
		},
		unrender: function(context, buffer){
			return buffer;
		},
		clone: function(context, buffer){
			return this;
		}
	});

	lang.mixin(ddtl, {
		cycle: function(parser, token){
			// summary:
			//		Cycle among the given strings each time this tag is encountered
			var args = token.split_contents();

			if(args.length < 2){
				throw new Error("'cycle' tag requires at least two arguments");
			}

			if(args[1].indexOf(",") != -1){
				var vars = args[1].split(",");
				args = [args[0]];
				for(var i = 0; i < vars.length; i++){
					args.push('"' + vars[i] + '"');
				}
			}

			if(args.length == 2){
				var name = args[args.length - 1];

				if(!parser._namedCycleNodes){
					throw new Error("No named cycles in template: '" + name + "' is not defined");
				}
				if(!parser._namedCycleNodes[name]){
					throw new Error("Named cycle '" + name + "' does not exist");
				}

				return parser._namedCycleNodes[name];
			}

			if(args.length > 4 && args[args.length - 2] == "as"){
				var name = args[args.length - 1];

				var node = new ddtl.CycleNode(args.slice(1, args.length - 2), name, parser.create_text_node());

				if(!parser._namedCycleNodes){
					parser._namedCycleNodes = {};
				}
				parser._namedCycleNodes[name] = node;
			}else{
				node = new ddtl.CycleNode(args.slice(1), null, parser.create_text_node());
			}

			return node;
		},
		ifchanged: function(parser, token){
			var parts = token.contents.split();
			var nodes = parser.parse(["endifchanged"]);
			parser.delete_first_token();
			return new ddtl.IfChangedNode(nodes, parts.slice(1));
		},
		regroup: function(parser, token){
			var tokens = Tokenize(token.contents, /(\s+)/g, function(spaces){
				return spaces;
			});
			if(tokens.length < 11 || tokens[tokens.length - 3] != "as" || tokens[tokens.length - 7] != "by"){
				throw new Error("Expected the format: regroup list by key as newList");
			}
			var expression = tokens.slice(2, -8).join("");
			var key = tokens[tokens.length - 5];
			var alias = tokens[tokens.length - 1];
			return new ddtl.RegroupNode(expression, key, alias);
		}
	});
	return dojox.dtl.tag.loop;
});