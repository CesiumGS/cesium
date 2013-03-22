dojo.provide("dojox.secure.DOM");
dojo.require("dojox.lang.observable");

dojox.secure.DOM = function(element){
	function safeNode(node){
		if(!node){
			return node;
		}
		var parent = node;
		do {
			if(parent == element){
				return wrap(node);
			}
		} while((parent = parent.parentNode));
		return null;
	}
	function wrap(result){
		if(result){
			if(result.nodeType){
				// wrap the node
				var wrapped = nodeObserver(result);
				if(result.nodeType == 1 && typeof wrapped.style == 'function'){ // if it is a function, that means it is holding a slot for us, now we will override it
					wrapped.style = styleObserver(result.style);
					wrapped.ownerDocument = safeDoc;
					wrapped.childNodes = {__get__:function(i){
						return wrap(result.childNodes[i]);
						},
						length:0
					};
					//TODO: maybe add attributes
				}
				return wrapped;
			}
			if(result && typeof result == 'object'){
				if(result.__observable){
					// we have already wrapped it, this helps prevent circular/infinite loops
					return result.__observable;
				}
				// wrap the node list
				wrapped = result instanceof Array ? [] : {};
				result.__observable = wrapped;
				for(var i in result){
					if (i != '__observable'){
						wrapped[i] = wrap(result[i]);
					}
				}
				wrapped.data__ = result;
				
				return wrapped;
			}
			if(typeof result == 'function'){
				var unwrap = function(result){
					if(typeof result == 'function'){
						// if untrusted code passes a function to trusted code, we want the trusted code to be
						// able to execute it and have the arguments automatically wrapped
						return function(){
							for (var i = 0; i < arguments.length; i++){
								arguments[i] = wrap(arguments[i]);
							}
							return unwrap(result.apply(wrap(this),arguments));
						}
					}
					return dojox.secure.unwrap(result);
				};
				// when we wrap a function we make it so that we can untrusted code can execute
				// the function and the arguments will be unwrapped for the trusted code
				return function(){
					if(result.safetyCheck){
						result.safetyCheck.apply(unwrap(this),arguments);
					}
					for (var i = 0; i < arguments.length; i++){
						arguments[i] = unwrap(arguments[i]);
					}
					return wrap(result.apply(unwrap(this),arguments));
				}
			}
		}
		return result;
	}
	unwrap = dojox.secure.unwrap;
	
	function safeCSS(css){
		css += ''; // make sure it is a string
		if(css.match(/behavior:|content:|javascript:|binding|expression|\@import/)){
			throw new Error("Illegal CSS");
		}
		var id = element.id || (element.id = "safe" + ('' + Math.random()).substring(2));
		return css.replace(/(\}|^)\s*([^\{]*\{)/g,function(t,a,b){ // put all the styles in the context of the id of the sandbox
			return a + ' #' + id + ' ' + b; // need to remove body and html references something like: .replace(/body/g,''); but that would break mybody...
		});
	}
	function safeURL(url){
		// test a url to see if it is safe
		if(url.match(/:/) && !url.match(/^(http|ftp|mailto)/)){
			throw new Error("Unsafe URL " + url);
		}
	}
	function safeElement(el){
		// test an element to see if it is safe
		if(el && el.nodeType == 1){
			if(el.tagName.match(/script/i)){
				var src = el.src;
				if (src && src != ""){
					// load the src and evaluate it safely
					el.parentNode.removeChild(el);
					dojo.xhrGet({url:src,secure:true}).addCallback(function(result){
						safeDoc.evaluate(result);
					});
				}
				else{
					//evaluate the script safely and remove it
					var script = el.innerHTML;
					el.parentNode.removeChild(el);
					wrap.evaluate(script);
				}
			}
			if(el.tagName.match(/link/i)){
				throw new Error("illegal tag");
			}
			if(el.tagName.match(/style/i)){
				var setCSS = function(cssStr){
					if(el.styleSheet){// IE
						el.styleSheet.cssText = cssStr;
					} else {// w3c
						var cssText = doc.createTextNode(cssStr);
						if (el.childNodes[0])
							el.replaceChild(cssText,el.childNodes[0])
						else
							el.appendChild(cssText);
					 }
					
				}
				src = el.src;
				if(src && src != ""){
					alert('src' + src);
					// try to load it by url and safely load it
					el.src = null;
					dojo.xhrGet({url:src,secure:true}).addCallback(function(result){
						setCSS(safeCSS(result));
					});
				}
				setCSS(safeCSS(el.innerHTML));
			}
			if(el.style){
				safeCSS(el.style.cssText);
			}
			if(el.href){
				safeURL(el.href);
			}
			if(el.src){
				safeURL(el.src);
			}
			var attr,i = 0;
			while ((attr=el.attributes[i++])){
				if(attr.name.substring(0,2)== "on" && attr.value != "null" && attr.value != ""){ // must remove all the event handlers
					throw new Error("event handlers not allowed in the HTML, they must be set with element.addEventListener");
				}
			}
			var children = el.childNodes;
			for (var i =0, l = children.length; i < l; i++){
				safeElement(children[i]);
			}
		}
	}
	function safeHTML(html){
		var div = document.createElement("div");
		if(html.match(/<object/i))
			throw new Error("The object tag is not allowed");
		div.innerHTML = html; // this is safe with an unattached node
		safeElement(div);
		return div;
	}
	var doc = element.ownerDocument;
	var safeDoc = {
		getElementById : function(id){
			return safeNode(doc.getElementById(id));
		},
		createElement : function(name){
			return wrap(doc.createElement(name));
		},
		createTextNode : function(name){
			return wrap(doc.createTextNode(name));
		},
		write : function(str){
			var div = safeHTML(str);
			while (div.childNodes.length){
				// move all these children to the main node
				element.appendChild(div.childNodes[0]);
			}
		}
	};
	safeDoc.open = safeDoc.close = function(){}; // no-op functions
	var setters = {
		innerHTML : function(node,value){
			console.log('setting innerHTML');
			node.innerHTML = safeHTML(value).innerHTML;
		}
	};
	setters.outerHTML = function(node,value){
		throw new Error("Can not set this property");
	}; // blocked
	function domChanger(name,newNodeArg){
		return function(node,args){
			safeElement(args[newNodeArg]);  // check to make sure the new node is safe
			return node[name](args[0]);// execute the method
		};
	}
	var invokers = {
		appendChild : domChanger("appendChild",0),
		insertBefore : domChanger("insertBefore",0),
		replaceChild : domChanger("replaceChild",1),
		cloneNode : function(node,args){
			return node.cloneNode(args[0]);
		},
		addEventListener : function(node,args){
			dojo.connect(node,'on' + args[0],this,function(event){
				event = nodeObserver(event || window.event);
				args[1].call(this,event);
			});
		}
	};
	invokers.childNodes = invokers.style = invokers.ownerDocument = function(){}; // this is a trick to get these property slots available, they will be overridden
	function makeObserver(setter){ // we make two of these, but the setter for style nodes is different
		return dojox.lang.makeObservable(
			function(node, prop){
				var result;
				return node[prop];
			},setter,
			function(wrapper, node, methodName, args){
				for (var i = 0; i < args.length; i++){
					args[i] = unwrap(args[i]);
				}
				if(invokers[methodName]){
					return wrap(invokers[methodName].call(wrapper,node,args));
				}
				return wrap(node[methodName].apply(node,args));
			},invokers);
	}
	var nodeObserver = makeObserver(function(node, prop, value){
			if(setters[prop]){
				setters[prop](node,value);
			}
			node[prop] = value;
		});
	var blockedStyles = {behavior:1,MozBinding:1};
	var styleObserver = makeObserver(function(node, prop, value){
			if(!blockedStyles[prop]){
				node[prop] = safeCSS(value);
			}
		});
	wrap.safeHTML = safeHTML;
	wrap.safeCSS = safeCSS;
	return wrap;
};
dojox.secure.unwrap = function unwrap(result){
	return (result && result.data__) || result;
};
