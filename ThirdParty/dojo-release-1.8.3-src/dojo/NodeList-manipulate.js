define(["./query", "./_base/lang", "./_base/array", "./dom-construct", "./NodeList-dom"], function(dquery, lang, array, construct){
	// module:
	//		dojo/NodeList-manipulate

	/*=====
	return function(){
		// summary:
		//		Adds chainable methods to dojo.query() / NodeList instances for manipulating HTML
		//		and DOM nodes and their properties.
	};
	=====*/

	var NodeList = dquery.NodeList;

	//TODO: add a way to parse for widgets in the injected markup?

	function getText(/*DOMNode*/node){
		// summary:
		//		recursion method for text() to use. Gets text value for a node.
		// description:
		//		Juse uses nodedValue so things like <br/> tags do not end up in
		//		the text as any sort of line return.
		var text = "", ch = node.childNodes;
		for(var i = 0, n; n = ch[i]; i++){
			//Skip comments.
			if(n.nodeType != 8){
				if(n.nodeType == 1){
					text += getText(n);
				}else{
					text += n.nodeValue;
				}
			}
		}
		return text;
	}

	function getWrapInsertion(/*DOMNode*/node){
		// summary:
		//		finds the innermost element to use for wrap insertion.

		//Make it easy, assume single nesting, no siblings.
		while(node.childNodes[0] && node.childNodes[0].nodeType == 1){
			node = node.childNodes[0];
		}
		return node; //DOMNode
	}

	function makeWrapNode(/*DOMNode||String*/html, /*DOMNode*/refNode){
		// summary:
		//		convert HTML into nodes if it is not already a node.
		if(typeof html == "string"){
			html = construct.toDom(html, (refNode && refNode.ownerDocument));
			if(html.nodeType == 11){
				//DocumentFragment cannot handle cloneNode, so choose first child.
				html = html.childNodes[0];
			}
		}else if(html.nodeType == 1 && html.parentNode){
			//This element is already in the DOM clone it, but not its children.
			html = html.cloneNode(false);
		}
		return html; /*DOMNode*/
	}

	lang.extend(NodeList, {
		_placeMultiple: function(/*String||Node||NodeList*/query, /*String*/position){
			// summary:
			//		private method for inserting queried nodes into all nodes in this NodeList
			//		at different positions. Differs from NodeList.place because it will clone
			//		the nodes in this NodeList if the query matches more than one element.
			var nl2 = typeof query == "string" || query.nodeType ? dquery(query) : query;
			var toAdd = [];
			for(var i = 0; i < nl2.length; i++){
				//Go backwards in DOM to make dom insertions easier via insertBefore
				var refNode = nl2[i];
				var length = this.length;
				for(var j = length - 1, item; item = this[j]; j--){
					if(i > 0){
						//Need to clone the item. This also means
						//it needs to be added to the current NodeList
						//so it can also be the target of other chaining operations.
						item = this._cloneNode(item);
						toAdd.unshift(item);
					}
					if(j == length - 1){
						construct.place(item, refNode, position);
					}else{
						refNode.parentNode.insertBefore(item, refNode);
					}
					refNode = item;
				}
			}

			if(toAdd.length){
				//Add the toAdd items to the current NodeList. Build up list of args
				//to pass to splice.
				toAdd.unshift(0);
				toAdd.unshift(this.length - 1);
				Array.prototype.splice.apply(this, toAdd);
			}

			return this; // dojo/NodeList
		},

		innerHTML: function(/*String|DOMNode|NodeList?*/ value){
			// summary:
			//		allows setting the innerHTML of each node in the NodeList,
			//		if there is a value passed in, otherwise, reads the innerHTML value of the first node.
			// description:
			//		This method is simpler than the dojo/NodeList.html() method provided by
			//		`dojo/NodeList-html`. This method just does proper innerHTML insertion of HTML fragments,
			//		and it allows for the innerHTML to be read for the first node in the node list.
			//		Since dojo/NodeList-html already took the "html" name, this method is called
			//		"innerHTML". However, if dojo/NodeList-html has not been loaded yet, this
			//		module will define an "html" method that can be used instead. Be careful if you
			//		are working in an environment where it is possible that dojo/NodeList-html could
			//		have been loaded, since its definition of "html" will take precedence.
			//		The nodes represented by the value argument will be cloned if more than one
			//		node is in this NodeList. The nodes in this NodeList are returned in the "set"
			//		usage of this method, not the HTML that was inserted.
			// returns:
			//		if no value is passed, the result is String, the innerHTML of the first node.
			//		If a value is passed, the return is this dojo/NodeList
			// example:
			//		assume a DOM created by this markup:
			//	|	<div id="foo"></div>
			//	|	<div id="bar"></div>
			//		This code inserts `<p>Hello World</p>` into both divs:
			//	|	dojo.query("div").innerHTML("<p>Hello World</p>");
			// example:
			//		assume a DOM created by this markup:
			//	|	<div id="foo"><p>Hello Mars</p></div>
			//	|	<div id="bar"><p>Hello World</p></div>
			//		This code returns `<p>Hello Mars</p>`:
			//	|	var message = dojo.query("div").innerHTML();
			if(arguments.length){
				return this.addContent(value, "only"); // dojo/NodeList
			}else{
				return this[0].innerHTML; //String
			}
		},

		/*=====
		html: function(value){
			// summary:
			//		see the information for "innerHTML". "html" is an alias for "innerHTML", but is
			//		only defined if dojo/NodeList-html has not been loaded.
			// description:
			//		An alias for the "innerHTML" method, but only defined if there is not an existing
			//		"html" method on dojo/NodeList. Be careful if you are working in an environment
			//		where it is possible that dojo/NodeList-html could have been loaded, since its
			//		definition of "html" will take precedence. If you are not sure if dojo/NodeList-html
			//		could be loaded, use the "innerHTML" method.
			// value: String|DOMNode|NodeList?
			//		The HTML fragment to use as innerHTML. If value is not passed, then the innerHTML
			//		of the first element in this NodeList is returned.
			// returns:
			//		if no value is passed, the result is String, the innerHTML of the first node.
			//		If a value is passed, the return is this dojo/NodeList
			return; // dojo/NodeList|String
		},
		=====*/

		text: function(/*String*/value){
			// summary:
			//		allows setting the text value of each node in the NodeList,
			//		if there is a value passed in, otherwise, returns the text value for all the
			//		nodes in the NodeList in one string.
			// example:
			//		assume a DOM created by this markup:
			//	|	<div id="foo"></div>
			//	|	<div id="bar"></div>
			//		This code inserts "Hello World" into both divs:
			//	|	dojo.query("div").text("Hello World");
			// example:
			//		assume a DOM created by this markup:
			//	|	<div id="foo"><p>Hello Mars <span>today</span></p></div>
			//	|	<div id="bar"><p>Hello World</p></div>
			//		This code returns "Hello Mars today":
			//	|	var message = dojo.query("div").text();
			// returns:
			//		if no value is passed, the result is String, the text value of the first node.
			//		If a value is passed, the return is this dojo/NodeList
			if(arguments.length){
				for(var i = 0, node; node = this[i]; i++){
					if(node.nodeType == 1){
						construct.empty(node);
						node.appendChild(node.ownerDocument.createTextNode(value));
					}
				}
				return this; // dojo/NodeList
			}else{
				var result = "";
				for(i = 0; node = this[i]; i++){
					result += getText(node);
				}
				return result; //String
			}
		},

		val: function(/*String||Array*/value){
			// summary:
			//		If a value is passed, allows seting the value property of form elements in this
			//		NodeList, or properly selecting/checking the right value for radio/checkbox/select
			//		elements. If no value is passed, the value of the first node in this NodeList
			//		is returned.
			// returns:
			//		if no value is passed, the result is String or an Array, for the value of the
			//		first node.
			//		If a value is passed, the return is this dojo/NodeList
			// example:
			//		assume a DOM created by this markup:
			//	|	<input type="text" value="foo">
			//	|	<select multiple>
			//	|		<option value="red" selected>Red</option>
			//	|		<option value="blue">Blue</option>
			//	|		<option value="yellow" selected>Yellow</option>
			//	|	</select>
			//		This code gets and sets the values for the form fields above:
			//	|	dojo.query('[type="text"]').val(); //gets value foo
			//	|	dojo.query('[type="text"]').val("bar"); //sets the input's value to "bar"
			// 	|	dojo.query("select").val() //gets array value ["red", "yellow"]
			// 	|	dojo.query("select").val(["blue", "yellow"]) //Sets the blue and yellow options to selected.

			//Special work for input elements.
			if(arguments.length){
				var isArray = lang.isArray(value);
				for(var index = 0, node; node = this[index]; index++){
					var name = node.nodeName.toUpperCase();
					var type = node.type;
					var newValue = isArray ? value[index] : value;

					if(name == "SELECT"){
						var opts = node.options;
						for(var i = 0; i < opts.length; i++){
							var opt = opts[i];
							if(node.multiple){
								opt.selected = (array.indexOf(value, opt.value) != -1);
							}else{
								opt.selected = (opt.value == newValue);
							}
						}
					}else if(type == "checkbox" || type == "radio"){
						node.checked = (node.value == newValue);
					}else{
						node.value = newValue;
					}
				}
				return this; // dojo/NodeList
			}else{
				//node already declared above.
				node = this[0];
				if(!node || node.nodeType != 1){
					return undefined;
				}
				value = node.value || "";
				if(node.nodeName.toUpperCase() == "SELECT" && node.multiple){
					//A multivalued selectbox. Do the pain.
					value = [];
					//opts declared above in if block.
					opts = node.options;
					//i declared above in if block;
					for(i = 0; i < opts.length; i++){
						//opt declared above in if block
						opt = opts[i];
						if(opt.selected){
							value.push(opt.value);
						}
					}
					if(!value.length){
						value = null;
					}
				}
				return value; //String||Array
			}
		},

		append: function(/*String||DOMNode||NodeList*/content){
			// summary:
			//		appends the content to every node in the NodeList.
			// description:
			//		The content will be cloned if the length of NodeList
			//		is greater than 1. Only the DOM nodes are cloned, not
			//		any attached event handlers.
			// returns:
			//		dojo/NodeList, the nodes currently in this NodeList will be returned,
			//		not the appended content.
			// example:
			//		assume a DOM created by this markup:
			//	|	<div id="foo"><p>Hello Mars</p></div>
			//	|	<div id="bar"><p>Hello World</p></div>
			//		Running this code:
			//	|	dojo.query("div").append("<span>append</span>");
			//		Results in this DOM structure:
			//	|	<div id="foo"><p>Hello Mars</p><span>append</span></div>
			//	|	<div id="bar"><p>Hello World</p><span>append</span></div>
			return this.addContent(content, "last"); // dojo/NodeList
		},

		appendTo: function(/*String*/query){
			// summary:
			//		appends nodes in this NodeList to the nodes matched by
			//		the query passed to appendTo.
			// description:
			//		The nodes in this NodeList will be cloned if the query
			//		matches more than one element. Only the DOM nodes are cloned, not
			//		any attached event handlers.
			// returns:
			//		dojo/NodeList, the nodes currently in this NodeList will be returned,
			//		not the matched nodes from the query.
			// example:
			//		assume a DOM created by this markup:
			//	|	<span>append</span>
			//	|	<p>Hello Mars</p>
			//	|	<p>Hello World</p>
			//		Running this code:
			//	|	dojo.query("span").appendTo("p");
			//		Results in this DOM structure:
			//	|	<p>Hello Mars<span>append</span></p>
			//	|	<p>Hello World<span>append</span></p>
			return this._placeMultiple(query, "last"); // dojo/NodeList
		},

		prepend: function(/*String||DOMNode||NodeList*/content){
			// summary:
			//		prepends the content to every node in the NodeList.
			// description:
			//		The content will be cloned if the length of NodeList
			//		is greater than 1. Only the DOM nodes are cloned, not
			//		any attached event handlers.
			// returns:
			//		dojo/NodeList, the nodes currently in this NodeList will be returned,
			//		not the appended content.
			//		assume a DOM created by this markup:
			//	|	<div id="foo"><p>Hello Mars</p></div>
			//	|	<div id="bar"><p>Hello World</p></div>
			//		Running this code:
			//	|	dojo.query("div").prepend("<span>prepend</span>");
			//		Results in this DOM structure:
			//	|	<div id="foo"><span>prepend</span><p>Hello Mars</p></div>
			//	|	<div id="bar"><span>prepend</span><p>Hello World</p></div>
			return this.addContent(content, "first"); // dojo/NodeList
		},

		prependTo: function(/*String*/query){
			// summary:
			//		prepends nodes in this NodeList to the nodes matched by
			//		the query passed to prependTo.
			// description:
			//		The nodes in this NodeList will be cloned if the query
			//		matches more than one element. Only the DOM nodes are cloned, not
			//		any attached event handlers.
			// returns:
			//		dojo/NodeList, the nodes currently in this NodeList will be returned,
			//		not the matched nodes from the query.
			// example:
			//		assume a DOM created by this markup:
			//	|	<span>prepend</span>
			//	|	<p>Hello Mars</p>
			//	|	<p>Hello World</p>
			//		Running this code:
			//	|	dojo.query("span").prependTo("p");
			//		Results in this DOM structure:
			//	|	<p><span>prepend</span>Hello Mars</p>
			//	|	<p><span>prepend</span>Hello World</p>
			return this._placeMultiple(query, "first"); // dojo/NodeList
		},

		after: function(/*String||Element||NodeList*/content){
			// summary:
			//		Places the content after every node in the NodeList.
			// description:
			//		The content will be cloned if the length of NodeList
			//		is greater than 1. Only the DOM nodes are cloned, not
			//		any attached event handlers.
			// returns:
			//		dojo/NodeList, the nodes currently in this NodeList will be returned,
			//		not the appended content.
			// example:
			//		assume a DOM created by this markup:
			//	|	<div id="foo"><p>Hello Mars</p></div>
			//	|	<div id="bar"><p>Hello World</p></div>
			//		Running this code:
			//	|	dojo.query("div").after("<span>after</span>");
			//		Results in this DOM structure:
			//	|	<div id="foo"><p>Hello Mars</p></div><span>after</span>
			//	|	<div id="bar"><p>Hello World</p></div><span>after</span>
			return this.addContent(content, "after"); // dojo/NodeList
		},

		insertAfter: function(/*String*/query){
			// summary:
			//		The nodes in this NodeList will be placed after the nodes
			//		matched by the query passed to insertAfter.
			// description:
			//		The nodes in this NodeList will be cloned if the query
			//		matches more than one element. Only the DOM nodes are cloned, not
			//		any attached event handlers.
			// returns:
			//		dojo/NodeList, the nodes currently in this NodeList will be returned,
			//		not the matched nodes from the query.
			// example:
			//		assume a DOM created by this markup:
			//	|	<span>after</span>
			//	|	<p>Hello Mars</p>
			//	|	<p>Hello World</p>
			//		Running this code:
			//	|	dojo.query("span").insertAfter("p");
			//		Results in this DOM structure:
			//	|	<p>Hello Mars</p><span>after</span>
			//	|	<p>Hello World</p><span>after</span>
			return this._placeMultiple(query, "after"); // dojo/NodeList
		},

		before: function(/*String||DOMNode||NodeList*/content){
			// summary:
			//		Places the content before every node in the NodeList.
			// description:
			//		The content will be cloned if the length of NodeList
			//		is greater than 1. Only the DOM nodes are cloned, not
			//		any attached event handlers.
			// returns:
			//		dojo/NodeList, the nodes currently in this NodeList will be returned,
			//		not the appended content.
			// example:
			//		assume a DOM created by this markup:
			//	|	<div id="foo"><p>Hello Mars</p></div>
			//	|	<div id="bar"><p>Hello World</p></div>
			//		Running this code:
			//	|	dojo.query("div").before("<span>before</span>");
			//		Results in this DOM structure:
			//	|	<span>before</span><div id="foo"><p>Hello Mars</p></div>
			//	|	<span>before</span><div id="bar"><p>Hello World</p></div>
			return this.addContent(content, "before"); // dojo/NodeList
		},

		insertBefore: function(/*String*/query){
			// summary:
			//		The nodes in this NodeList will be placed after the nodes
			//		matched by the query passed to insertAfter.
			// description:
			//		The nodes in this NodeList will be cloned if the query
			//		matches more than one element. Only the DOM nodes are cloned, not
			//		any attached event handlers.
			// returns:
			//		dojo/NodeList, the nodes currently in this NodeList will be returned,
			//		not the matched nodes from the query.
			// example:
			//		assume a DOM created by this markup:
			//	|	<span>before</span>
			//	|	<p>Hello Mars</p>
			//	|	<p>Hello World</p>
			//		Running this code:
			//	|	dojo.query("span").insertBefore("p");
			//		Results in this DOM structure:
			//	|	<span>before</span><p>Hello Mars</p>
			//	|	<span>before</span><p>Hello World</p>
			return this._placeMultiple(query, "before"); // dojo/NodeList
		},

		/*=====
		remove: function(simpleFilter){
			// summary:
			//		alias for dojo/NodeList's orphan method. Removes elements
			//		in this list that match the simple filter from their parents
			//		and returns them as a new NodeList.
			// simpleFilter: String
			//		single-expression CSS rule. For example, ".thinger" or
			//		"#someId[attrName='value']" but not "div > span". In short,
			//		anything which does not invoke a descent to evaluate but
			//		can instead be used to test a single node is acceptable.

			return; // dojo/NodeList
		},
		=====*/
		remove: NodeList.prototype.orphan,

		wrap: function(/*String||DOMNode*/html){
			// summary:
			//		Wrap each node in the NodeList with html passed to wrap.
			// description:
			//		html will be cloned if the NodeList has more than one
			//		element. Only DOM nodes are cloned, not any attached
			//		event handlers.
			// returns:
			//		the nodes in the current NodeList will be returned,
			//		not the nodes from html argument.
			// example:
			//		assume a DOM created by this markup:
			//	|	<b>one</b>
			//	|	<b>two</b>
			//		Running this code:
			//	|	dojo.query("b").wrap("<div><span></span></div>");
			//		Results in this DOM structure:
			//	|	<div><span><b>one</b></span></div>
			//	|	<div><span><b>two</b></span></div>
			if(this[0]){
				html = makeWrapNode(html, this[0]);

				//Now cycle through the elements and do the insertion.
				for(var i = 0, node; node = this[i]; i++){
					//Always clone because if html is used to hold one of
					//the "this" nodes, then on the clone of html it will contain
					//that "this" node, and that would be bad.
					var clone = this._cloneNode(html);
					if(node.parentNode){
						node.parentNode.replaceChild(clone, node);
					}
					//Find deepest element and insert old node in it.
					var insertion = getWrapInsertion(clone);
					insertion.appendChild(node);
				}
			}
			return this; // dojo/NodeList
		},

		wrapAll: function(/*String||DOMNode*/html){
			// summary:
			//		Insert html where the first node in this NodeList lives, then place all
			//		nodes in this NodeList as the child of the html.
			// returns:
			//		the nodes in the current NodeList will be returned,
			//		not the nodes from html argument.
			// example:
			//		assume a DOM created by this markup:
			//	|	<div class="container">
			// 	|		<div class="red">Red One</div>
			// 	|		<div class="blue">Blue One</div>
			// 	|		<div class="red">Red Two</div>
			// 	|		<div class="blue">Blue Two</div>
			//	|	</div>
			//		Running this code:
			//	|	dojo.query(".red").wrapAll('<div class="allRed"></div>');
			//		Results in this DOM structure:
			//	|	<div class="container">
			// 	|		<div class="allRed">
			// 	|			<div class="red">Red One</div>
			// 	|			<div class="red">Red Two</div>
			// 	|		</div>
			// 	|		<div class="blue">Blue One</div>
			// 	|		<div class="blue">Blue Two</div>
			//	|	</div>
			if(this[0]){
				html = makeWrapNode(html, this[0]);

				//Place the wrap HTML in place of the first node.
				this[0].parentNode.replaceChild(html, this[0]);

				//Now cycle through the elements and move them inside
				//the wrap.
				var insertion = getWrapInsertion(html);
				for(var i = 0, node; node = this[i]; i++){
					insertion.appendChild(node);
				}
			}
			return this; // dojo/NodeList
		},

		wrapInner: function(/*String||DOMNode*/html){
			// summary:
			//		For each node in the NodeList, wrap all its children with the passed in html.
			// description:
			//		html will be cloned if the NodeList has more than one
			//		element. Only DOM nodes are cloned, not any attached
			//		event handlers.
			// returns:
			//		the nodes in the current NodeList will be returned,
			//		not the nodes from html argument.
			// example:
			//		assume a DOM created by this markup:
			//	|	<div class="container">
			// 	|		<div class="red">Red One</div>
			// 	|		<div class="blue">Blue One</div>
			// 	|		<div class="red">Red Two</div>
			// 	|		<div class="blue">Blue Two</div>
			//	|	</div>
			//		Running this code:
			//	|	dojo.query(".red").wrapInner('<span class="special"></span>');
			//		Results in this DOM structure:
			//	|	<div class="container">
			// 	|		<div class="red"><span class="special">Red One</span></div>
			// 	|		<div class="blue">Blue One</div>
			// 	|		<div class="red"><span class="special">Red Two</span></div>
			// 	|		<div class="blue">Blue Two</div>
			//	|	</div>
			if(this[0]){
				html = makeWrapNode(html, this[0]);
				for(var i = 0; i < this.length; i++){
					//Always clone because if html is used to hold one of
					//the "this" nodes, then on the clone of html it will contain
					//that "this" node, and that would be bad.
					var clone = this._cloneNode(html);

					//Need to convert the childNodes to an array since wrapAll modifies the
					//DOM and can change the live childNodes NodeList.
					this._wrap(lang._toArray(this[i].childNodes), null, this._NodeListCtor).wrapAll(clone);
				}
			}
			return this; // dojo/NodeList
		},

		replaceWith: function(/*String||DOMNode||NodeList*/content){
			// summary:
			//		Replaces each node in ths NodeList with the content passed to replaceWith.
			// description:
			//		The content will be cloned if the length of NodeList
			//		is greater than 1. Only the DOM nodes are cloned, not
			//		any attached event handlers.
			// returns:
			//		The nodes currently in this NodeList will be returned, not the replacing content.
			//		Note that the returned nodes have been removed from the DOM.
			// example:
			//		assume a DOM created by this markup:
			//	|	<div class="container">
			// 	|		<div class="red">Red One</div>
			// 	|		<div class="blue">Blue One</div>
			// 	|		<div class="red">Red Two</div>
			// 	|		<div class="blue">Blue Two</div>
			//	|	</div>
			//		Running this code:
			//	|	dojo.query(".red").replaceWith('<div class="green">Green</div>');
			//		Results in this DOM structure:
			//	|	<div class="container">
			// 	|		<div class="green">Green</div>
			// 	|		<div class="blue">Blue One</div>
			// 	|		<div class="green">Green</div>
			// 	|		<div class="blue">Blue Two</div>
			//	|	</div>
			content = this._normalize(content, this[0]);
			for(var i = 0, node; node = this[i]; i++){
				this._place(content, node, "before", i > 0);
				node.parentNode.removeChild(node);
			}
			return this; // dojo/NodeList
		},

		replaceAll: function(/*String*/query){
			// summary:
			//		replaces nodes matched by the query passed to replaceAll with the nodes
			//		in this NodeList.
			// description:
			//		The nodes in this NodeList will be cloned if the query
			//		matches more than one element. Only the DOM nodes are cloned, not
			//		any attached event handlers.
			// returns:
			//		The nodes currently in this NodeList will be returned, not the matched nodes
			//		from the query. The nodes currently in this NodeLIst could have
			//		been cloned, so the returned NodeList will include the cloned nodes.
			// example:
			//		assume a DOM created by this markup:
			//	|	<div class="container">
			// 	|		<div class="spacer">___</div>
			// 	|		<div class="red">Red One</div>
			// 	|		<div class="spacer">___</div>
			// 	|		<div class="blue">Blue One</div>
			// 	|		<div class="spacer">___</div>
			// 	|		<div class="red">Red Two</div>
			// 	|		<div class="spacer">___</div>
			// 	|		<div class="blue">Blue Two</div>
			//	|	</div>
			//		Running this code:
			//	|	dojo.query(".red").replaceAll(".blue");
			//		Results in this DOM structure:
			//	|	<div class="container">
			// 	|		<div class="spacer">___</div>
			// 	|		<div class="spacer">___</div>
			// 	|		<div class="red">Red One</div>
			// 	|		<div class="red">Red Two</div>
			// 	|		<div class="spacer">___</div>
			// 	|		<div class="spacer">___</div>
			// 	|		<div class="red">Red One</div>
			// 	|		<div class="red">Red Two</div>
			//	|	</div>
			var nl = dquery(query);
			var content = this._normalize(this, this[0]);
			for(var i = 0, node; node = nl[i]; i++){
				this._place(content, node, "before", i > 0);
				node.parentNode.removeChild(node);
			}
			return this; // dojo/NodeList
		},

		clone: function(){
			// summary:
			//		Clones all the nodes in this NodeList and returns them as a new NodeList.
			// description:
			//		Only the DOM nodes are cloned, not any attached event handlers.
			// returns:
			//		a cloned set of the original nodes.
			// example:
			//		assume a DOM created by this markup:
			//	|	<div class="container">
			// 	|		<div class="red">Red One</div>
			// 	|		<div class="blue">Blue One</div>
			// 	|		<div class="red">Red Two</div>
			// 	|		<div class="blue">Blue Two</div>
			//	|	</div>
			//		Running this code:
			//	|	dojo.query(".red").clone().appendTo(".container");
			//		Results in this DOM structure:
			//	|	<div class="container">
			// 	|		<div class="red">Red One</div>
			// 	|		<div class="blue">Blue One</div>
			// 	|		<div class="red">Red Two</div>
			// 	|		<div class="blue">Blue Two</div>
			// 	|		<div class="red">Red One</div>
			// 	|		<div class="red">Red Two</div>
			//	|	</div>

			//TODO: need option to clone events?
			var ary = [];
			for(var i = 0; i < this.length; i++){
				ary.push(this._cloneNode(this[i]));
			}
			return this._wrap(ary, this, this._NodeListCtor); // dojo/NodeList
		}
	});

	//set up html method if one does not exist
	if(!NodeList.prototype.html){
		NodeList.prototype.html = NodeList.prototype.innerHTML;
	}

	return NodeList;
});
