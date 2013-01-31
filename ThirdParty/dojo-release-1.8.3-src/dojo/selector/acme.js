define([
	"../dom", "../sniff", "../_base/array", "../_base/lang", "../_base/window"
], function(dom, has, array, lang, win){

	// module:
	//		dojo/selector/acme

/*
	acme architectural overview:

		acme is a relatively full-featured CSS3 query library. It is
		designed to take any valid CSS3 selector and return the nodes matching
		the selector. To do this quickly, it processes queries in several
		steps, applying caching where profitable.

		The steps (roughly in reverse order of the way they appear in the code):
			1.) check to see if we already have a "query dispatcher"
				- if so, use that with the given parameterization. Skip to step 4.
			2.) attempt to determine which branch to dispatch the query to:
				- JS (optimized DOM iteration)
				- native (FF3.1+, Safari 3.1+, IE 8+)
			3.) tokenize and convert to executable "query dispatcher"
				- this is where the lion's share of the complexity in the
					system lies. In the DOM version, the query dispatcher is
					assembled as a chain of "yes/no" test functions pertaining to
					a section of a simple query statement (".blah:nth-child(odd)"
					but not "div div", which is 2 simple statements). Individual
					statement dispatchers are cached (to prevent re-definition)
					as are entire dispatch chains (to make re-execution of the
					same query fast)
			4.) the resulting query dispatcher is called in the passed scope
					(by default the top-level document)
				- for DOM queries, this results in a recursive, top-down
					evaluation of nodes based on each simple query section
				- for native implementations, this may mean working around spec
					bugs. So be it.
			5.) matched nodes are pruned to ensure they are unique (if necessary)
*/


	////////////////////////////////////////////////////////////////////////
	// Toolkit aliases
	////////////////////////////////////////////////////////////////////////

	// if you are extracting acme for use in your own system, you will
	// need to provide these methods and properties. No other porting should be
	// necessary, save for configuring the system to use a class other than
	// dojo/NodeList as the return instance instantiator
	var trim = 			lang.trim;
	var each = 			array.forEach;

	var getDoc = function(){ return win.doc; };
	// NOTE(alex): the spec is idiotic. CSS queries should ALWAYS be case-sensitive, but nooooooo
	var cssCaseBug = (getDoc().compatMode) == "BackCompat";

	////////////////////////////////////////////////////////////////////////
	// Global utilities
	////////////////////////////////////////////////////////////////////////


	var specials = ">~+";

	// global thunk to determine whether we should treat the current query as
	// case sensitive or not. This switch is flipped by the query evaluator
	// based on the document passed as the context to search.
	var caseSensitive = false;

	// how high?
	var yesman = function(){ return true; };

	////////////////////////////////////////////////////////////////////////
	// Tokenizer
	////////////////////////////////////////////////////////////////////////

	var getQueryParts = function(query){
		// summary:
		//		state machine for query tokenization
		// description:
		//		instead of using a brittle and slow regex-based CSS parser,
		//		acme implements an AST-style query representation. This
		//		representation is only generated once per query. For example,
		//		the same query run multiple times or under different root nodes
		//		does not re-parse the selector expression but instead uses the
		//		cached data structure. The state machine implemented here
		//		terminates on the last " " (space) character and returns an
		//		ordered array of query component structures (or "parts"). Each
		//		part represents an operator or a simple CSS filtering
		//		expression. The structure for parts is documented in the code
		//		below.


		// NOTE:
		//		this code is designed to run fast and compress well. Sacrifices
		//		to readability and maintainability have been made.  Your best
		//		bet when hacking the tokenizer is to put The Donnas on *really*
		//		loud (may we recommend their "Spend The Night" release?) and
		//		just assume you're gonna make mistakes. Keep the unit tests
		//		open and run them frequently. Knowing is half the battle ;-)
		if(specials.indexOf(query.slice(-1)) >= 0){
			// if we end with a ">", "+", or "~", that means we're implicitly
			// searching all children, so make it explicit
			query += " * ";
		}else{
			// if you have not provided a terminator, one will be provided for
			// you...
			query += " ";
		}

		var ts = function(/*Integer*/ s, /*Integer*/ e){
			// trim and slice.

			// take an index to start a string slice from and an end position
			// and return a trimmed copy of that sub-string
			return trim(query.slice(s, e));
		};

		// the overall data graph of the full query, as represented by queryPart objects
		var queryParts = [];


		// state keeping vars
		var inBrackets = -1, inParens = -1, inMatchFor = -1,
			inPseudo = -1, inClass = -1, inId = -1, inTag = -1, currentQuoteChar,
			lc = "", cc = "", pStart;

		// iteration vars
		var x = 0, // index in the query
			ql = query.length,
			currentPart = null, // data structure representing the entire clause
			_cp = null; // the current pseudo or attr matcher

		// several temporary variables are assigned to this structure during a
		// potential sub-expression match:
		//		attr:
		//			a string representing the current full attribute match in a
		//			bracket expression
		//		type:
		//			if there's an operator in a bracket expression, this is
		//			used to keep track of it
		//		value:
		//			the internals of parenthetical expression for a pseudo. for
		//			:nth-child(2n+1), value might be "2n+1"

		var endTag = function(){
			// called when the tokenizer hits the end of a particular tag name.
			// Re-sets state variables for tag matching and sets up the matcher
			// to handle the next type of token (tag or operator).
			if(inTag >= 0){
				var tv = (inTag == x) ? null : ts(inTag, x); // .toLowerCase();
				currentPart[ (specials.indexOf(tv) < 0) ? "tag" : "oper" ] = tv;
				inTag = -1;
			}
		};

		var endId = function(){
			// called when the tokenizer might be at the end of an ID portion of a match
			if(inId >= 0){
				currentPart.id = ts(inId, x).replace(/\\/g, "");
				inId = -1;
			}
		};

		var endClass = function(){
			// called when the tokenizer might be at the end of a class name
			// match. CSS allows for multiple classes, so we augment the
			// current item with another class in its list
			if(inClass >= 0){
				currentPart.classes.push(ts(inClass + 1, x).replace(/\\/g, ""));
				inClass = -1;
			}
		};

		var endAll = function(){
			// at the end of a simple fragment, so wall off the matches
			endId();
			endTag();
			endClass();
		};

		var endPart = function(){
			endAll();
			if(inPseudo >= 0){
				currentPart.pseudos.push({ name: ts(inPseudo + 1, x) });
			}
			// hint to the selector engine to tell it whether or not it
			// needs to do any iteration. Many simple selectors don't, and
			// we can avoid significant construction-time work by advising
			// the system to skip them
			currentPart.loops = (
					currentPart.pseudos.length ||
					currentPart.attrs.length ||
					currentPart.classes.length	);

			currentPart.oquery = currentPart.query = ts(pStart, x); // save the full expression as a string


			// otag/tag are hints to suggest to the system whether or not
			// it's an operator or a tag. We save a copy of otag since the
			// tag name is cast to upper-case in regular HTML matches. The
			// system has a global switch to figure out if the current
			// expression needs to be case sensitive or not and it will use
			// otag or tag accordingly
			currentPart.otag = currentPart.tag = (currentPart["oper"]) ? null : (currentPart.tag || "*");

			if(currentPart.tag){
				// if we're in a case-insensitive HTML doc, we likely want
				// the toUpperCase when matching on element.tagName. If we
				// do it here, we can skip the string op per node
				// comparison
				currentPart.tag = currentPart.tag.toUpperCase();
			}

			// add the part to the list
			if(queryParts.length && (queryParts[queryParts.length-1].oper)){
				// operators are always infix, so we remove them from the
				// list and attach them to the next match. The evaluator is
				// responsible for sorting out how to handle them.
				currentPart.infixOper = queryParts.pop();
				currentPart.query = currentPart.infixOper.query + " " + currentPart.query;
				/*
				console.debug(	"swapping out the infix",
								currentPart.infixOper,
								"and attaching it to",
								currentPart);
				*/
			}
			queryParts.push(currentPart);

			currentPart = null;
		};

		// iterate over the query, character by character, building up a
		// list of query part objects
		for(; lc=cc, cc=query.charAt(x), x < ql; x++){
			//		cc: the current character in the match
			//		lc: the last character (if any)

			// someone is trying to escape something, so don't try to match any
			// fragments. We assume we're inside a literal.
			if(lc == "\\"){ continue; }
			if(!currentPart){ // a part was just ended or none has yet been created
				// NOTE: I hate all this alloc, but it's shorter than writing tons of if's
				pStart = x;
				//	rules describe full CSS sub-expressions, like:
				//		#someId
				//		.className:first-child
				//	but not:
				//		thinger > div.howdy[type=thinger]
				//	the indidual components of the previous query would be
				//	split into 3 parts that would be represented a structure like:
				//		[
				//			{
				//				query: "thinger",
				//				tag: "thinger",
				//			},
				//			{
				//				query: "div.howdy[type=thinger]",
				//				classes: ["howdy"],
				//				infixOper: {
				//					query: ">",
				//					oper: ">",
				//				}
				//			},
				//		]
				currentPart = {
					query: null, // the full text of the part's rule
					pseudos: [], // CSS supports multiple pseud-class matches in a single rule
					attrs: [],	// CSS supports multi-attribute match, so we need an array
					classes: [], // class matches may be additive, e.g.: .thinger.blah.howdy
					tag: null,	// only one tag...
					oper: null, // ...or operator per component. Note that these wind up being exclusive.
					id: null,	// the id component of a rule
					getTag: function(){
						return caseSensitive ? this.otag : this.tag;
					}
				};

				// if we don't have a part, we assume we're going to start at
				// the beginning of a match, which should be a tag name. This
				// might fault a little later on, but we detect that and this
				// iteration will still be fine.
				inTag = x;
			}

			// Skip processing all quoted characters.
			// If we are inside quoted text then currentQuoteChar stores the character that began the quote,
			// thus that character that will end it.
			if(currentQuoteChar){
				if(cc == currentQuoteChar){
					currentQuoteChar = null;
				}
				continue;
			}else if (cc == "'" || cc == '"'){
				currentQuoteChar = cc;
				continue;
			}

			if(inBrackets >= 0){
				// look for a the close first
				if(cc == "]"){ // if we're in a [...] clause and we end, do assignment
					if(!_cp.attr){
						// no attribute match was previously begun, so we
						// assume this is an attribute existence match in the
						// form of [someAttributeName]
						_cp.attr = ts(inBrackets+1, x);
					}else{
						// we had an attribute already, so we know that we're
						// matching some sort of value, as in [attrName=howdy]
						_cp.matchFor = ts((inMatchFor||inBrackets+1), x);
					}
					var cmf = _cp.matchFor;
					if(cmf){
						// try to strip quotes from the matchFor value. We want
						// [attrName=howdy] to match the same
						//	as [attrName = 'howdy' ]
						if(	(cmf.charAt(0) == '"') || (cmf.charAt(0) == "'") ){
							_cp.matchFor = cmf.slice(1, -1);
						}
					}
					// remove backslash escapes from an attribute match, since DOM
					// querying will get attribute values without backslashes
					if(_cp.matchFor){
						_cp.matchFor = _cp.matchFor.replace(/\\/g, "");
					}

					// end the attribute by adding it to the list of attributes.
					currentPart.attrs.push(_cp);
					_cp = null; // necessary?
					inBrackets = inMatchFor = -1;
				}else if(cc == "="){
					// if the last char was an operator prefix, make sure we
					// record it along with the "=" operator.
					var addToCc = ("|~^$*".indexOf(lc) >=0 ) ? lc : "";
					_cp.type = addToCc+cc;
					_cp.attr = ts(inBrackets+1, x-addToCc.length);
					inMatchFor = x+1;
				}
				// now look for other clause parts
			}else if(inParens >= 0){
				// if we're in a parenthetical expression, we need to figure
				// out if it's attached to a pseudo-selector rule like
				// :nth-child(1)
				if(cc == ")"){
					if(inPseudo >= 0){
						_cp.value = ts(inParens+1, x);
					}
					inPseudo = inParens = -1;
				}
			}else if(cc == "#"){
				// start of an ID match
				endAll();
				inId = x+1;
			}else if(cc == "."){
				// start of a class match
				endAll();
				inClass = x;
			}else if(cc == ":"){
				// start of a pseudo-selector match
				endAll();
				inPseudo = x;
			}else if(cc == "["){
				// start of an attribute match.
				endAll();
				inBrackets = x;
				// provide a new structure for the attribute match to fill-in
				_cp = {
					/*=====
					attr: null, type: null, matchFor: null
					=====*/
				};
			}else if(cc == "("){
				// we really only care if we've entered a parenthetical
				// expression if we're already inside a pseudo-selector match
				if(inPseudo >= 0){
					// provide a new structure for the pseudo match to fill-in
					_cp = {
						name: ts(inPseudo+1, x),
						value: null
					};
					currentPart.pseudos.push(_cp);
				}
				inParens = x;
			}else if(
				(cc == " ") &&
				// if it's a space char and the last char is too, consume the
				// current one without doing more work
				(lc != cc)
			){
				endPart();
			}
		}
		return queryParts;
	};


	////////////////////////////////////////////////////////////////////////
	// DOM query infrastructure
	////////////////////////////////////////////////////////////////////////

	var agree = function(first, second){
		// the basic building block of the yes/no chaining system. agree(f1,
		// f2) generates a new function which returns the boolean results of
		// both of the passed functions to a single logical-anded result. If
		// either are not passed, the other is used exclusively.
		if(!first){ return second; }
		if(!second){ return first; }

		return function(){
			return first.apply(window, arguments) && second.apply(window, arguments);
		};
	};

	var getArr = function(i, arr){
		// helps us avoid array alloc when we don't need it
		var r = arr||[]; // FIXME: should this be 'new d._NodeListCtor()' ?
		if(i){ r.push(i); }
		return r;
	};

	var _isElement = function(n){ return (1 == n.nodeType); };

	// FIXME: need to coalesce _getAttr with defaultGetter
	var blank = "";
	var _getAttr = function(elem, attr){
		if(!elem){ return blank; }
		if(attr == "class"){
			return elem.className || blank;
		}
		if(attr == "for"){
			return elem.htmlFor || blank;
		}
		if(attr == "style"){
			return elem.style.cssText || blank;
		}
		return (caseSensitive ? elem.getAttribute(attr) : elem.getAttribute(attr, 2)) || blank;
	};

	var attrs = {
		"*=": function(attr, value){
			return function(elem){
				// E[foo*="bar"]
				//		an E element whose "foo" attribute value contains
				//		the substring "bar"
				return (_getAttr(elem, attr).indexOf(value)>=0);
			};
		},
		"^=": function(attr, value){
			// E[foo^="bar"]
			//		an E element whose "foo" attribute value begins exactly
			//		with the string "bar"
			return function(elem){
				return (_getAttr(elem, attr).indexOf(value)==0);
			};
		},
		"$=": function(attr, value){
			// E[foo$="bar"]
			//		an E element whose "foo" attribute value ends exactly
			//		with the string "bar"
			return function(elem){
				var ea = " "+_getAttr(elem, attr);
				var lastIndex = ea.lastIndexOf(value);
				return lastIndex > -1 && (lastIndex==(ea.length-value.length));
			};
		},
		"~=": function(attr, value){
			// E[foo~="bar"]
			//		an E element whose "foo" attribute value is a list of
			//		space-separated values, one of which is exactly equal
			//		to "bar"

			// return "[contains(concat(' ',@"+attr+",' '), ' "+ value +" ')]";
			var tval = " "+value+" ";
			return function(elem){
				var ea = " "+_getAttr(elem, attr)+" ";
				return (ea.indexOf(tval)>=0);
			};
		},
		"|=": function(attr, value){
			// E[hreflang|="en"]
			//		an E element whose "hreflang" attribute has a
			//		hyphen-separated list of values beginning (from the
			//		left) with "en"
			var valueDash = value+"-";
			return function(elem){
				var ea = _getAttr(elem, attr);
				return (
					(ea == value) ||
					(ea.indexOf(valueDash)==0)
				);
			};
		},
		"=": function(attr, value){
			return function(elem){
				return (_getAttr(elem, attr) == value);
			};
		}
	};

	// avoid testing for node type if we can. Defining this in the negative
	// here to avoid negation in the fast path.
	var _noNES = (typeof getDoc().firstChild.nextElementSibling == "undefined");
	var _ns = !_noNES ? "nextElementSibling" : "nextSibling";
	var _ps = !_noNES ? "previousElementSibling" : "previousSibling";
	var _simpleNodeTest = (_noNES ? _isElement : yesman);

	var _lookLeft = function(node){
		// look left
		while(node = node[_ps]){
			if(_simpleNodeTest(node)){ return false; }
		}
		return true;
	};

	var _lookRight = function(node){
		// look right
		while(node = node[_ns]){
			if(_simpleNodeTest(node)){ return false; }
		}
		return true;
	};

	var getNodeIndex = function(node){
		var root = node.parentNode;
		root = root.nodeType != 7 ? root : root.nextSibling; // PROCESSING_INSTRUCTION_NODE
		var i = 0,
			tret = root.children || root.childNodes,
			ci = (node["_i"]||node.getAttribute("_i")||-1),
			cl = (root["_l"]|| (typeof root.getAttribute !== "undefined" ? root.getAttribute("_l") : -1));

		if(!tret){ return -1; }
		var l = tret.length;

		// we calculate the parent length as a cheap way to invalidate the
		// cache. It's not 100% accurate, but it's much more honest than what
		// other libraries do
		if( cl == l && ci >= 0 && cl >= 0 ){
			// if it's legit, tag and release
			return ci;
		}

		// else re-key things
		if(has("ie") && typeof root.setAttribute !== "undefined"){
			root.setAttribute("_l", l);
		}else{
			root["_l"] = l;
		}
		ci = -1;
		for(var te = root["firstElementChild"]||root["firstChild"]; te; te = te[_ns]){
			if(_simpleNodeTest(te)){
				if(has("ie")){
					te.setAttribute("_i", ++i);
				}else{
					te["_i"] = ++i;
				}
				if(node === te){
					// NOTE:
					//	shortcutting the return at this step in indexing works
					//	very well for benchmarking but we avoid it here since
					//	it leads to potential O(n^2) behavior in sequential
					//	getNodexIndex operations on a previously un-indexed
					//	parent. We may revisit this at a later time, but for
					//	now we just want to get the right answer more often
					//	than not.
					ci = i;
				}
			}
		}
		return ci;
	};

	var isEven = function(elem){
		return !((getNodeIndex(elem)) % 2);
	};

	var isOdd = function(elem){
		return ((getNodeIndex(elem)) % 2);
	};

	var pseudos = {
		"checked": function(name, condition){
			return function(elem){
				return !!("checked" in elem ? elem.checked : elem.selected);
			};
		},
		"disabled": function(name, condition){
			return function(elem){
				return elem.disabled;
			};
		},
		"enabled": function(name, condition){
			return function(elem){
				return !elem.disabled;
			};
		},
		"first-child": function(){ return _lookLeft; },
		"last-child": function(){ return _lookRight; },
		"only-child": function(name, condition){
			return function(node){
				return _lookLeft(node) && _lookRight(node);
			};
		},
		"empty": function(name, condition){
			return function(elem){
				// DomQuery and jQuery get this wrong, oddly enough.
				// The CSS 3 selectors spec is pretty explicit about it, too.
				var cn = elem.childNodes;
				var cnl = elem.childNodes.length;
				// if(!cnl){ return true; }
				for(var x=cnl-1; x >= 0; x--){
					var nt = cn[x].nodeType;
					if((nt === 1)||(nt == 3)){ return false; }
				}
				return true;
			};
		},
		"contains": function(name, condition){
			var cz = condition.charAt(0);
			if( cz == '"' || cz == "'" ){ //remove quote
				condition = condition.slice(1, -1);
			}
			return function(elem){
				return (elem.innerHTML.indexOf(condition) >= 0);
			};
		},
		"not": function(name, condition){
			var p = getQueryParts(condition)[0];
			var ignores = { el: 1 };
			if(p.tag != "*"){
				ignores.tag = 1;
			}
			if(!p.classes.length){
				ignores.classes = 1;
			}
			var ntf = getSimpleFilterFunc(p, ignores);
			return function(elem){
				return (!ntf(elem));
			};
		},
		"nth-child": function(name, condition){
			var pi = parseInt;
			// avoid re-defining function objects if we can
			if(condition == "odd"){
				return isOdd;
			}else if(condition == "even"){
				return isEven;
			}
			// FIXME: can we shorten this?
			if(condition.indexOf("n") != -1){
				var tparts = condition.split("n", 2);
				var pred = tparts[0] ? ((tparts[0] == '-') ? -1 : pi(tparts[0])) : 1;
				var idx = tparts[1] ? pi(tparts[1]) : 0;
				var lb = 0, ub = -1;
				if(pred > 0){
					if(idx < 0){
						idx = (idx % pred) && (pred + (idx % pred));
					}else if(idx>0){
						if(idx >= pred){
							lb = idx - idx % pred;
						}
						idx = idx % pred;
					}
				}else if(pred<0){
					pred *= -1;
					// idx has to be greater than 0 when pred is negative;
					// shall we throw an error here?
					if(idx > 0){
						ub = idx;
						idx = idx % pred;
					}
				}
				if(pred > 0){
					return function(elem){
						var i = getNodeIndex(elem);
						return (i>=lb) && (ub<0 || i<=ub) && ((i % pred) == idx);
					};
				}else{
					condition = idx;
				}
			}
			var ncount = pi(condition);
			return function(elem){
				return (getNodeIndex(elem) == ncount);
			};
		}
	};

	var defaultGetter = (has("ie") < 9 || has("ie") == 9 && has("quirks")) ? function(cond){
		var clc = cond.toLowerCase();
		if(clc == "class"){ cond = "className"; }
		return function(elem){
			return (caseSensitive ? elem.getAttribute(cond) : elem[cond]||elem[clc]);
		};
	} : function(cond){
		return function(elem){
			return (elem && elem.getAttribute && elem.hasAttribute(cond));
		};
	};

	var getSimpleFilterFunc = function(query, ignores){
		// generates a node tester function based on the passed query part. The
		// query part is one of the structures generated by the query parser
		// when it creates the query AST. The "ignores" object specifies which
		// (if any) tests to skip, allowing the system to avoid duplicating
		// work where it may have already been taken into account by other
		// factors such as how the nodes to test were fetched in the first
		// place
		if(!query){ return yesman; }
		ignores = ignores||{};

		var ff = null;

		if(!("el" in ignores)){
			ff = agree(ff, _isElement);
		}

		if(!("tag" in ignores)){
			if(query.tag != "*"){
				ff = agree(ff, function(elem){
					return (elem && ((caseSensitive ? elem.tagName : elem.tagName.toUpperCase()) == query.getTag()));
				});
			}
		}

		if(!("classes" in ignores)){
			each(query.classes, function(cname, idx, arr){
				// get the class name
				/*
				var isWildcard = cname.charAt(cname.length-1) == "*";
				if(isWildcard){
					cname = cname.substr(0, cname.length-1);
				}
				// I dislike the regex thing, even if memoized in a cache, but it's VERY short
				var re = new RegExp("(?:^|\\s)" + cname + (isWildcard ? ".*" : "") + "(?:\\s|$)");
				*/
				var re = new RegExp("(?:^|\\s)" + cname + "(?:\\s|$)");
				ff = agree(ff, function(elem){
					return re.test(elem.className);
				});
				ff.count = idx;
			});
		}

		if(!("pseudos" in ignores)){
			each(query.pseudos, function(pseudo){
				var pn = pseudo.name;
				if(pseudos[pn]){
					ff = agree(ff, pseudos[pn](pn, pseudo.value));
				}
			});
		}

		if(!("attrs" in ignores)){
			each(query.attrs, function(attr){
				var matcher;
				var a = attr.attr;
				// type, attr, matchFor
				if(attr.type && attrs[attr.type]){
					matcher = attrs[attr.type](a, attr.matchFor);
				}else if(a.length){
					matcher = defaultGetter(a);
				}
				if(matcher){
					ff = agree(ff, matcher);
				}
			});
		}

		if(!("id" in ignores)){
			if(query.id){
				ff = agree(ff, function(elem){
					return (!!elem && (elem.id == query.id));
				});
			}
		}

		if(!ff){
			if(!("default" in ignores)){
				ff = yesman;
			}
		}
		return ff;
	};

	var _nextSibling = function(filterFunc){
		return function(node, ret, bag){
			while(node = node[_ns]){
				if(_noNES && (!_isElement(node))){ continue; }
				if(
					(!bag || _isUnique(node, bag)) &&
					filterFunc(node)
				){
					ret.push(node);
				}
				break;
			}
			return ret;
		};
	};

	var _nextSiblings = function(filterFunc){
		return function(root, ret, bag){
			var te = root[_ns];
			while(te){
				if(_simpleNodeTest(te)){
					if(bag && !_isUnique(te, bag)){
						break;
					}
					if(filterFunc(te)){
						ret.push(te);
					}
				}
				te = te[_ns];
			}
			return ret;
		};
	};

	// get an array of child *elements*, skipping text and comment nodes
	var _childElements = function(filterFunc){
		filterFunc = filterFunc||yesman;
		return function(root, ret, bag){
			// get an array of child elements, skipping text and comment nodes
			var te, x = 0, tret = root.children || root.childNodes;
			while(te = tret[x++]){
				if(
					_simpleNodeTest(te) &&
					(!bag || _isUnique(te, bag)) &&
					(filterFunc(te, x))
				){
					ret.push(te);
				}
			}
			return ret;
		};
	};

	// test to see if node is below root
	var _isDescendant = function(node, root){
		var pn = node.parentNode;
		while(pn){
			if(pn == root){
				break;
			}
			pn = pn.parentNode;
		}
		return !!pn;
	};

	var _getElementsFuncCache = {};

	var getElementsFunc = function(query){
		var retFunc = _getElementsFuncCache[query.query];
		// if we've got a cached dispatcher, just use that
		if(retFunc){ return retFunc; }
		// else, generate a new on

		// NOTE:
		//		this function returns a function that searches for nodes and
		//		filters them.  The search may be specialized by infix operators
		//		(">", "~", or "+") else it will default to searching all
		//		descendants (the " " selector). Once a group of children is
		//		found, a test function is applied to weed out the ones we
		//		don't want. Many common cases can be fast-pathed. We spend a
		//		lot of cycles to create a dispatcher that doesn't do more work
		//		than necessary at any point since, unlike this function, the
		//		dispatchers will be called every time. The logic of generating
		//		efficient dispatchers looks like this in pseudo code:
		//
		//		# if it's a purely descendant query (no ">", "+", or "~" modifiers)
		//		if infixOperator == " ":
		//			if only(id):
		//				return def(root):
		//					return d.byId(id, root);
		//
		//			elif id:
		//				return def(root):
		//					return filter(d.byId(id, root));
		//
		//			elif cssClass && getElementsByClassName:
		//				return def(root):
		//					return filter(root.getElementsByClassName(cssClass));
		//
		//			elif only(tag):
		//				return def(root):
		//					return root.getElementsByTagName(tagName);
		//
		//			else:
		//				# search by tag name, then filter
		//				return def(root):
		//					return filter(root.getElementsByTagName(tagName||"*"));
		//
		//		elif infixOperator == ">":
		//			# search direct children
		//			return def(root):
		//				return filter(root.children);
		//
		//		elif infixOperator == "+":
		//			# search next sibling
		//			return def(root):
		//				return filter(root.nextElementSibling);
		//
		//		elif infixOperator == "~":
		//			# search rightward siblings
		//			return def(root):
		//				return filter(nextSiblings(root));

		var io = query.infixOper;
		var oper = (io ? io.oper : "");
		// the default filter func which tests for all conditions in the query
		// part. This is potentially inefficient, so some optimized paths may
		// re-define it to test fewer things.
		var filterFunc = getSimpleFilterFunc(query, { el: 1 });
		var qt = query.tag;
		var wildcardTag = ("*" == qt);
		var ecs = getDoc()["getElementsByClassName"];

		if(!oper){
			// if there's no infix operator, then it's a descendant query. ID
			// and "elements by class name" variants can be accelerated so we
			// call them out explicitly:
			if(query.id){
				// testing shows that the overhead of yesman() is acceptable
				// and can save us some bytes vs. re-defining the function
				// everywhere.
				filterFunc = (!query.loops && wildcardTag) ?
					yesman :
					getSimpleFilterFunc(query, { el: 1, id: 1 });

				retFunc = function(root, arr){
					var te = dom.byId(query.id, (root.ownerDocument||root));
					if(!te || !filterFunc(te)){ return; }
					if(9 == root.nodeType){ // if root's a doc, we just return directly
						return getArr(te, arr);
					}else{ // otherwise check ancestry
						if(_isDescendant(te, root)){
							return getArr(te, arr);
						}
					}
				};
			}else if(
				ecs &&
				// isAlien check. Workaround for Prototype.js being totally evil/dumb.
				/\{\s*\[native code\]\s*\}/.test(String(ecs)) &&
				query.classes.length &&
				!cssCaseBug
			){
				// it's a class-based query and we've got a fast way to run it.

				// ignore class and ID filters since we will have handled both
				filterFunc = getSimpleFilterFunc(query, { el: 1, classes: 1, id: 1 });
				var classesString = query.classes.join(" ");
				retFunc = function(root, arr, bag){
					var ret = getArr(0, arr), te, x=0;
					var tret = root.getElementsByClassName(classesString);
					while((te = tret[x++])){
						if(filterFunc(te, root) && _isUnique(te, bag)){
							ret.push(te);
						}
					}
					return ret;
				};

			}else if(!wildcardTag && !query.loops){
				// it's tag only. Fast-path it.
				retFunc = function(root, arr, bag){
					var ret = getArr(0, arr), te, x=0;
					var tag = query.getTag(),
						tret = tag ? root.getElementsByTagName(tag) : [];
					while((te = tret[x++])){
						if(_isUnique(te, bag)){
							ret.push(te);
						}
					}
					return ret;
				};
			}else{
				// the common case:
				//		a descendant selector without a fast path. By now it's got
				//		to have a tag selector, even if it's just "*" so we query
				//		by that and filter
				filterFunc = getSimpleFilterFunc(query, { el: 1, tag: 1, id: 1 });
				retFunc = function(root, arr, bag){
					var ret = getArr(0, arr), te, x=0;
					// we use getTag() to avoid case sensitivity issues
					var tag = query.getTag(),
						tret = tag ? root.getElementsByTagName(tag) : [];
					while((te = tret[x++])){
						if(filterFunc(te, root) && _isUnique(te, bag)){
							ret.push(te);
						}
					}
					return ret;
				};
			}
		}else{
			// the query is scoped in some way. Instead of querying by tag we
			// use some other collection to find candidate nodes
			var skipFilters = { el: 1 };
			if(wildcardTag){
				skipFilters.tag = 1;
			}
			filterFunc = getSimpleFilterFunc(query, skipFilters);
			if("+" == oper){
				retFunc = _nextSibling(filterFunc);
			}else if("~" == oper){
				retFunc = _nextSiblings(filterFunc);
			}else if(">" == oper){
				retFunc = _childElements(filterFunc);
			}
		}
		// cache it and return
		return _getElementsFuncCache[query.query] = retFunc;
	};

	var filterDown = function(root, queryParts){
		// NOTE:
		//		this is the guts of the DOM query system. It takes a list of
		//		parsed query parts and a root and finds children which match
		//		the selector represented by the parts
		var candidates = getArr(root), qp, x, te, qpl = queryParts.length, bag, ret;

		for(var i = 0; i < qpl; i++){
			ret = [];
			qp = queryParts[i];
			x = candidates.length - 1;
			if(x > 0){
				// if we have more than one root at this level, provide a new
				// hash to use for checking group membership but tell the
				// system not to post-filter us since we will already have been
				// guaranteed to be unique
				bag = {};
				ret.nozip = true;
			}
			var gef = getElementsFunc(qp);
			for(var j = 0; (te = candidates[j]); j++){
				// for every root, get the elements that match the descendant
				// selector, adding them to the "ret" array and filtering them
				// via membership in this level's bag. If there are more query
				// parts, then this level's return will be used as the next
				// level's candidates
				gef(te, ret, bag);
			}
			if(!ret.length){ break; }
			candidates = ret;
		}
		return ret;
	};

	////////////////////////////////////////////////////////////////////////
	// the query runner
	////////////////////////////////////////////////////////////////////////

	// these are the primary caches for full-query results. The query
	// dispatcher functions are generated then stored here for hash lookup in
	// the future
	var _queryFuncCacheDOM = {},
		_queryFuncCacheQSA = {};

	// this is the second level of splitting, from full-length queries (e.g.,
	// "div.foo .bar") into simple query expressions (e.g., ["div.foo",
	// ".bar"])
	var getStepQueryFunc = function(query){
		var qparts = getQueryParts(trim(query));

		// if it's trivial, avoid iteration and zipping costs
		if(qparts.length == 1){
			// we optimize this case here to prevent dispatch further down the
			// chain, potentially slowing things down. We could more elegantly
			// handle this in filterDown(), but it's slower for simple things
			// that need to be fast (e.g., "#someId").
			var tef = getElementsFunc(qparts[0]);
			return function(root){
				var r = tef(root, []);
				if(r){ r.nozip = true; }
				return r;
			};
		}

		// otherwise, break it up and return a runner that iterates over the parts recursively
		return function(root){
			return filterDown(root, qparts);
		};
	};

	// NOTES:
	//	* we can't trust QSA for anything but document-rooted queries, so
	//	  caching is split into DOM query evaluators and QSA query evaluators
	//	* caching query results is dirty and leak-prone (or, at a minimum,
	//	  prone to unbounded growth). Other toolkits may go this route, but
	//	  they totally destroy their own ability to manage their memory
	//	  footprint. If we implement it, it should only ever be with a fixed
	//	  total element reference # limit and an LRU-style algorithm since JS
	//	  has no weakref support. Caching compiled query evaluators is also
	//	  potentially problematic, but even on large documents the size of the
	//	  query evaluators is often < 100 function objects per evaluator (and
	//	  LRU can be applied if it's ever shown to be an issue).
	//	* since IE's QSA support is currently only for HTML documents and even
	//	  then only in IE 8's "standards mode", we have to detect our dispatch
	//	  route at query time and keep 2 separate caches. Ugg.

	// we need to determine if we think we can run a given query via
	// querySelectorAll or if we'll need to fall back on DOM queries to get
	// there. We need a lot of information about the environment and the query
	// to make the determination (e.g. does it support QSA, does the query in
	// question work in the native QSA impl, etc.).

	// IE QSA queries may incorrectly include comment nodes, so we throw the
	// zipping function into "remove" comments mode instead of the normal "skip
	// it" which every other QSA-clued browser enjoys
	var noZip = has("ie") ? "commentStrip" : "nozip";

	var qsa = "querySelectorAll";
	var qsaAvail = !!getDoc()[qsa];

	//Don't bother with n+3 type of matches, IE complains if we modify those.
	var infixSpaceRe = /\\[>~+]|n\+\d|([^ \\])?([>~+])([^ =])?/g;
	var infixSpaceFunc = function(match, pre, ch, post){
		return ch ? (pre ? pre + " " : "") + ch + (post ? " " + post : "") : /*n+3*/ match;
	};
	
	//Don't apply the infixSpaceRe to attribute value selectors
	var attRe = /([^[]*)([^\]]*])?/g;
	var attFunc = function(match, nonAtt, att){
		return nonAtt.replace(infixSpaceRe, infixSpaceFunc) + (att||"");
	};
	var getQueryFunc = function(query, forceDOM){
		//Normalize query. The CSS3 selectors spec allows for omitting spaces around
		//infix operators, >, ~ and +
		//Do the work here since detection for spaces is used as a simple "not use QSA"
		//test below.
		query = query.replace(attRe, attFunc);

		if(qsaAvail){
			// if we've got a cached variant and we think we can do it, run it!
			var qsaCached = _queryFuncCacheQSA[query];
			if(qsaCached && !forceDOM){ return qsaCached; }
		}

		// else if we've got a DOM cached variant, assume that we already know
		// all we need to and use it
		var domCached = _queryFuncCacheDOM[query];
		if(domCached){ return domCached; }

		// TODO:
		//		today we're caching DOM and QSA branches separately so we
		//		recalc useQSA every time. If we had a way to tag root+query
		//		efficiently, we'd be in good shape to do a global cache.

		var qcz = query.charAt(0);
		var nospace = (-1 == query.indexOf(" "));

		// byId searches are wicked fast compared to QSA, even when filtering
		// is required
		if( (query.indexOf("#") >= 0) && (nospace) ){
			forceDOM = true;
		}

		var useQSA = (
			qsaAvail && (!forceDOM) &&
			// as per CSS 3, we can't currently start w/ combinator:
			//		http://www.w3.org/TR/css3-selectors/#w3cselgrammar
			(specials.indexOf(qcz) == -1) &&
			// IE's QSA impl sucks on pseudos
			(!has("ie") || (query.indexOf(":") == -1)) &&

			(!(cssCaseBug && (query.indexOf(".") >= 0))) &&

			// FIXME:
			//		need to tighten up browser rules on ":contains" and "|=" to
			//		figure out which aren't good
			//		Latest webkit (around 531.21.8) does not seem to do well with :checked on option
			//		elements, even though according to spec, selected options should
			//		match :checked. So go nonQSA for it:
			//		http://bugs.dojotoolkit.org/ticket/5179
			(query.indexOf(":contains") == -1) && (query.indexOf(":checked") == -1) &&
			(query.indexOf("|=") == -1) // some browsers don't grok it
		);

		// TODO:
		//		if we've got a descendant query (e.g., "> .thinger" instead of
		//		just ".thinger") in a QSA-able doc, but are passed a child as a
		//		root, it should be possible to give the item a synthetic ID and
		//		trivially rewrite the query to the form "#synid > .thinger" to
		//		use the QSA branch


		if(useQSA){
			var tq = (specials.indexOf(query.charAt(query.length-1)) >= 0) ?
						(query + " *") : query;
			return _queryFuncCacheQSA[query] = function(root){
				try{
					// the QSA system contains an egregious spec bug which
					// limits us, effectively, to only running QSA queries over
					// entire documents.  See:
					//		http://ejohn.org/blog/thoughts-on-queryselectorall/
					//	despite this, we can also handle QSA runs on simple
					//	selectors, but we don't want detection to be expensive
					//	so we're just checking for the presence of a space char
					//	right now. Not elegant, but it's cheaper than running
					//	the query parser when we might not need to
					if(!((9 == root.nodeType) || nospace)){ throw ""; }
					var r = root[qsa](tq);
					// skip expensive duplication checks and just wrap in a NodeList
					r[noZip] = true;
					return r;
				}catch(e){
					// else run the DOM branch on this query, ensuring that we
					// default that way in the future
					return getQueryFunc(query, true)(root);
				}
			};
		}else{
			// DOM branch
			var parts = query.match(/([^\s,](?:"(?:\\.|[^"])+"|'(?:\\.|[^'])+'|[^,])*)/g);
			return _queryFuncCacheDOM[query] = ((parts.length < 2) ?
				// if not a compound query (e.g., ".foo, .bar"), cache and return a dispatcher
				getStepQueryFunc(query) :
				// if it *is* a complex query, break it up into its
				// constituent parts and return a dispatcher that will
				// merge the parts when run
				function(root){
					var pindex = 0, // avoid array alloc for every invocation
						ret = [],
						tp;
					while((tp = parts[pindex++])){
						ret = ret.concat(getStepQueryFunc(tp)(root));
					}
					return ret;
				}
			);
		}
	};

	var _zipIdx = 0;

	// NOTE:
	//		this function is Moo inspired, but our own impl to deal correctly
	//		with XML in IE
	var _nodeUID = has("ie") ? function(node){
		if(caseSensitive){
			// XML docs don't have uniqueID on their nodes
			return (node.getAttribute("_uid") || node.setAttribute("_uid", ++_zipIdx) || _zipIdx);

		}else{
			return node.uniqueID;
		}
	} :
	function(node){
		return (node._uid || (node._uid = ++_zipIdx));
	};

	// determine if a node in is unique in a "bag". In this case we don't want
	// to flatten a list of unique items, but rather just tell if the item in
	// question is already in the bag. Normally we'd just use hash lookup to do
	// this for us but IE's DOM is busted so we can't really count on that. On
	// the upside, it gives us a built in unique ID function.
	var _isUnique = function(node, bag){
		if(!bag){ return 1; }
		var id = _nodeUID(node);
		if(!bag[id]){ return bag[id] = 1; }
		return 0;
	};

	// attempt to efficiently determine if an item in a list is a dupe,
	// returning a list of "uniques", hopefully in document order
	var _zipIdxName = "_zipIdx";
	var _zip = function(arr){
		if(arr && arr.nozip){
			return arr;
		}
		var ret = [];
		if(!arr || !arr.length){ return ret; }
		if(arr[0]){
			ret.push(arr[0]);
		}
		if(arr.length < 2){ return ret; }

		_zipIdx++;

		// we have to fork here for IE and XML docs because we can't set
		// expandos on their nodes (apparently). *sigh*
		var x, te;
		if(has("ie") && caseSensitive){
			var szidx = _zipIdx+"";
			arr[0].setAttribute(_zipIdxName, szidx);
			for(x = 1; te = arr[x]; x++){
				if(arr[x].getAttribute(_zipIdxName) != szidx){
					ret.push(te);
				}
				te.setAttribute(_zipIdxName, szidx);
			}
		}else if(has("ie") && arr.commentStrip){
			try{
				for(x = 1; te = arr[x]; x++){
					if(_isElement(te)){
						ret.push(te);
					}
				}
			}catch(e){ /* squelch */ }
		}else{
			if(arr[0]){ arr[0][_zipIdxName] = _zipIdx; }
			for(x = 1; te = arr[x]; x++){
				if(arr[x][_zipIdxName] != _zipIdx){
					ret.push(te);
				}
				te[_zipIdxName] = _zipIdx;
			}
		}
		return ret;
	};

	// the main executor
	var query = function(/*String*/ query, /*String|DOMNode?*/ root){
		// summary:
		//		Returns nodes which match the given CSS3 selector, searching the
		//		entire document by default but optionally taking a node to scope
		//		the search by. Returns an array.
		// description:
		//		dojo.query() is the swiss army knife of DOM node manipulation in
		//		Dojo. Much like Prototype's "$$" (bling-bling) function or JQuery's
		//		"$" function, dojo.query provides robust, high-performance
		//		CSS-based node selector support with the option of scoping searches
		//		to a particular sub-tree of a document.
		//
		//		Supported Selectors:
		//		--------------------
		//
		//		acme supports a rich set of CSS3 selectors, including:
		//
		//		- class selectors (e.g., `.foo`)
		//		- node type selectors like `span`
		//		- ` ` descendant selectors
		//		- `>` child element selectors
		//		- `#foo` style ID selectors
		//		- `*` universal selector
		//		- `~`, the preceded-by sibling selector
		//		- `+`, the immediately preceded-by sibling selector
		//		- attribute queries:
		//			- `[foo]` attribute presence selector
		//			- `[foo='bar']` attribute value exact match
		//			- `[foo~='bar']` attribute value list item match
		//			- `[foo^='bar']` attribute start match
		//			- `[foo$='bar']` attribute end match
		//			- `[foo*='bar']` attribute substring match
		//		- `:first-child`, `:last-child`, and `:only-child` positional selectors
		//		- `:empty` content emtpy selector
		//		- `:checked` pseudo selector
		//		- `:nth-child(n)`, `:nth-child(2n+1)` style positional calculations
		//		- `:nth-child(even)`, `:nth-child(odd)` positional selectors
		//		- `:not(...)` negation pseudo selectors
		//
		//		Any legal combination of these selectors will work with
		//		`dojo.query()`, including compound selectors ("," delimited).
		//		Very complex and useful searches can be constructed with this
		//		palette of selectors and when combined with functions for
		//		manipulation presented by dojo/NodeList, many types of DOM
		//		manipulation operations become very straightforward.
		//
		//		Unsupported Selectors:
		//		----------------------
		//
		//		While dojo.query handles many CSS3 selectors, some fall outside of
		//		what's reasonable for a programmatic node querying engine to
		//		handle. Currently unsupported selectors include:
		//
		//		- namespace-differentiated selectors of any form
		//		- all `::` pseduo-element selectors
		//		- certain pseudo-selectors which don't get a lot of day-to-day use:
		//			- `:root`, `:lang()`, `:target`, `:focus`
		//		- all visual and state selectors:
		//			- `:root`, `:active`, `:hover`, `:visited`, `:link`,
		//				  `:enabled`, `:disabled`
		//			- `:*-of-type` pseudo selectors
		//
		//		dojo.query and XML Documents:
		//		-----------------------------
		//
		//		`dojo.query` (as of dojo 1.2) supports searching XML documents
		//		in a case-sensitive manner. If an HTML document is served with
		//		a doctype that forces case-sensitivity (e.g., XHTML 1.1
		//		Strict), dojo.query() will detect this and "do the right
		//		thing". Case sensitivity is dependent upon the document being
		//		searched and not the query used. It is therefore possible to
		//		use case-sensitive queries on strict sub-documents (iframes,
		//		etc.) or XML documents while still assuming case-insensitivity
		//		for a host/root document.
		//
		//		Non-selector Queries:
		//		---------------------
		//
		//		If something other than a String is passed for the query,
		//		`dojo.query` will return a new `dojo/NodeList` instance
		//		constructed from that parameter alone and all further
		//		processing will stop. This means that if you have a reference
		//		to a node or NodeList, you can quickly construct a new NodeList
		//		from the original by calling `dojo.query(node)` or
		//		`dojo.query(list)`.
		//
		// query:
		//		The CSS3 expression to match against. For details on the syntax of
		//		CSS3 selectors, see <http://www.w3.org/TR/css3-selectors/#selectors>
		// root:
		//		A DOMNode (or node id) to scope the search from. Optional.
		// returns: Array
		// example:
		//		search the entire document for elements with the class "foo":
		//	|	dojo.query(".foo");
		//		these elements will match:
		//	|	<span class="foo"></span>
		//	|	<span class="foo bar"></span>
		//	|	<p class="thud foo"></p>
		// example:
		//		search the entire document for elements with the classes "foo" *and* "bar":
		//	|	dojo.query(".foo.bar");
		//		these elements will match:
		//	|	<span class="foo bar"></span>
		//		while these will not:
		//	|	<span class="foo"></span>
		//	|	<p class="thud foo"></p>
		// example:
		//		find `<span>` elements which are descendants of paragraphs and
		//		which have a "highlighted" class:
		//	|	dojo.query("p span.highlighted");
		//		the innermost span in this fragment matches:
		//	|	<p class="foo">
		//	|		<span>...
		//	|			<span class="highlighted foo bar">...</span>
		//	|		</span>
		//	|	</p>
		// example:
		//		set an "odd" class on all odd table rows inside of the table
		//		`#tabular_data`, using the `>` (direct child) selector to avoid
		//		affecting any nested tables:
		//	|	dojo.query("#tabular_data > tbody > tr:nth-child(odd)").addClass("odd");
		// example:
		//		remove all elements with the class "error" from the document
		//		and store them in a list:
		//	|	var errors = dojo.query(".error").orphan();
		// example:
		//		add an onclick handler to every submit button in the document
		//		which causes the form to be sent via Ajax instead:
		//	|	dojo.query("input[type='submit']").onclick(function(e){
		//	|		dojo.stopEvent(e); // prevent sending the form
		//	|		var btn = e.target;
		//	|		dojo.xhrPost({
		//	|			form: btn.form,
		//	|			load: function(data){
		//	|				// replace the form with the response
		//	|				var div = dojo.doc.createElement("div");
		//	|				dojo.place(div, btn.form, "after");
		//	|				div.innerHTML = data;
		//	|				dojo.style(btn.form, "display", "none");
		//	|			}
		//	|		});
		//	|	});

		root = root || getDoc();

		// throw the big case sensitivity switch
		var od = root.ownerDocument || root;	// root is either Document or a node inside the document
		caseSensitive = (od.createElement("div").tagName === "div");

		// NOTE:
		//		adding "true" as the 2nd argument to getQueryFunc is useful for
		//		testing the DOM branch without worrying about the
		//		behavior/performance of the QSA branch.
		var r = getQueryFunc(query)(root);

		// FIXME:
		//		need to investigate this branch WRT #8074 and #8075
		if(r && r.nozip){
			return r;
		}
		return _zip(r); // dojo/NodeList
	};
	query.filter = function(/*Node[]*/ nodeList, /*String*/ filter, /*String|DOMNode?*/ root){
		// summary:
		//		function for filtering a NodeList based on a selector, optimized for simple selectors
		var tmpNodeList = [],
			parts = getQueryParts(filter),
			filterFunc =
				(parts.length == 1 && !/[^\w#\.]/.test(filter)) ?
				getSimpleFilterFunc(parts[0]) :
				function(node){
					return array.indexOf(query(filter, dom.byId(root)), node) != -1;
				};
		for(var x = 0, te; te = nodeList[x]; x++){
			if(filterFunc(te)){ tmpNodeList.push(te); }
		}
		return tmpNodeList;
	};
	return query;
});
