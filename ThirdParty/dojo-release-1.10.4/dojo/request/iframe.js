define([
	'module',
	'require',
	'./watch',
	'./util',
	'./handlers',
	'../_base/lang',
	'../io-query',
	'../query',
	'../has',
	'../dom',
	'../dom-construct',
	'../_base/window',
	'../NodeList-dom'/*=====,
	'../request',
	'../_base/declare' =====*/
], function(module, require, watch, util, handlers, lang, ioQuery, query, has, dom, domConstruct, win/*=====, NodeList, request, declare =====*/){
	var mid = module.id.replace(/[\/\.\-]/g, '_'),
		onload = mid + '_onload';

	if(!win.global[onload]){
		win.global[onload] = function(){
			var dfd = iframe._currentDfd;
			if(!dfd){
				iframe._fireNextRequest();
				return;
			}

			var response = dfd.response,
				options = response.options,
				formNode = dom.byId(options.form) || dfd._tmpForm;

			if(formNode){
				// remove all the hidden content inputs
				var toClean = dfd._contentToClean;
				for(var i=0; i<toClean.length; i++){
					var key = toClean[i];
					//Need to cycle over all nodes since we may have added
					//an array value which means that more than one node could
					//have the same .name value.
					for(var j=0; j<formNode.childNodes.length; j++){
						var childNode = formNode.childNodes[j];
						if(childNode.name === key){
							domConstruct.destroy(childNode);
							break;
						}
					}
				}

				// restore original action + target
				dfd._originalAction && formNode.setAttribute('action', dfd._originalAction);
				if(dfd._originalMethod){
					formNode.setAttribute('method', dfd._originalMethod);
					formNode.method = dfd._originalMethod;
				}
				if(dfd._originalTarget){
					formNode.setAttribute('target', dfd._originalTarget);
					formNode.target = dfd._originalTarget;
				}
			}

			if(dfd._tmpForm){
				domConstruct.destroy(dfd._tmpForm);
				delete dfd._tmpForm;
			}

			dfd._finished = true;
		};
	}

	function create(name, onloadstr, uri){
		if(win.global[name]){
			return win.global[name];
		}

		if(win.global.frames[name]){
			return win.global.frames[name];
		}

		if(!uri){
			if(has('config-useXDomain') && !has('config-dojoBlankHtmlUrl')){
				console.warn('dojo/request/iframe: When using cross-domain Dojo builds,' +
					' please save dojo/resources/blank.html to your domain and set dojoConfig.dojoBlankHtmlUrl' +
					' to the path on your domain to blank.html');
			}
			uri = (has('config-dojoBlankHtmlUrl')||require.toUrl('dojo/resources/blank.html'));
		}

		var frame = domConstruct.place(
			'<iframe id="'+name+'" name="'+name+'" src="'+uri+'" onload="'+onloadstr+
			'" style="position: absolute; left: 1px; top: 1px; height: 1px; width: 1px; visibility: hidden">',
			win.body());

		win.global[name] = frame;

		return frame;
	}

	function setSrc(_iframe, src, replace){
		var frame = win.global.frames[_iframe.name];

		if(frame.contentWindow){
			// We have an iframe node instead of the window
			frame = frame.contentWindow;
		}

		try{
			if(!replace){
				frame.location = src;
			}else{
				frame.location.replace(src);
			}
		}catch(e){
			console.log('dojo/request/iframe.setSrc: ', e);
		}
	}

	function doc(iframeNode){
		if(iframeNode.contentDocument){
			return iframeNode.contentDocument;
		}
		var name = iframeNode.name;
		if(name){
			var iframes = win.doc.getElementsByTagName('iframe');
			if(iframeNode.document && iframes[name].contentWindow && iframes[name].contentWindow.document){
				return iframes[name].contentWindow.document;
			}else if(win.doc.frames[name] && win.doc.frames[name].document){
				return win.doc.frames[name].document;
			}
		}
		return null;
	}

	function createForm(){
		return domConstruct.create('form', {
			name: mid + '_form',
			style: {
				position: 'absolute',
				top: '-1000px',
				left: '-1000px'
			}
		}, win.body());
	}

	function fireNextRequest(){
		// summary:
		//		Internal method used to fire the next request in the queue.
		var dfd;
		try{
			if(iframe._currentDfd || !iframe._dfdQueue.length){
				return;
			}
			do{
				dfd = iframe._currentDfd = iframe._dfdQueue.shift();
			}while(dfd && (dfd.canceled || (dfd.isCanceled && dfd.isCanceled())) && iframe._dfdQueue.length);

			if(!dfd || dfd.canceled || (dfd.isCanceled && dfd.isCanceled())){
				iframe._currentDfd = null;
				return;
			}

			var response = dfd.response,
				options = response.options,
				c2c = dfd._contentToClean = [],
				formNode = dom.byId(options.form),
				notify = util.notify,
				data = options.data || null,
				queryStr;

			if(!dfd._legacy && options.method === 'POST' && !formNode){
				formNode = dfd._tmpForm = createForm();
			}else if(options.method === 'GET' && formNode && response.url.indexOf('?') > -1){
				queryStr = response.url.slice(response.url.indexOf('?') + 1);
				data = lang.mixin(ioQuery.queryToObject(queryStr), data);
			}

			if(formNode){
				if(!dfd._legacy){
					var parentNode = formNode;
					do{
						parentNode = parentNode.parentNode;
					}while(parentNode && parentNode !== win.doc.documentElement);

					// Append the form node or some browsers won't work
					if(!parentNode){
						formNode.style.position = 'absolute';
						formNode.style.left = '-1000px';
						formNode.style.top = '-1000px';
						win.body().appendChild(formNode);
					}

					if(!formNode.name){
						formNode.name = mid + '_form';
					}
				}

				// if we have things in data, we need to add them to the form
				// before submission
				if(data){
					var createInput = function(name, value){
						domConstruct.create('input', {
							type: 'hidden',
							name: name,
							value: value
						}, formNode);
						c2c.push(name);
					};
					for(var x in data){
						var val = data[x];
						if(lang.isArray(val) && val.length > 1){
							for(var i=0; i<val.length; i++){
								createInput(x, val[i]);
							}
						}else{
							if(!formNode[x]){
								createInput(x, val);
							}else{
								formNode[x].value = val;
							}
						}
					}
				}

				//IE requires going through getAttributeNode instead of just getAttribute in some form cases,
				//so use it for all.  See #2844
				var actionNode = formNode.getAttributeNode('action'),
					methodNode = formNode.getAttributeNode('method'),
					targetNode = formNode.getAttributeNode('target');

				if(response.url){
					dfd._originalAction = actionNode ? actionNode.value : null;
					if(actionNode){
						actionNode.value = response.url;
					}else{
						formNode.setAttribute('action', response.url);
					}
				}

				if(!dfd._legacy){
					dfd._originalMethod = methodNode ? methodNode.value : null;
					if(methodNode){
						methodNode.value = options.method;
					}else{
						formNode.setAttribute('method', options.method);
					}
				}else{
					if(!methodNode || !methodNode.value){
						if(methodNode){
							methodNode.value = options.method;
						}else{
							formNode.setAttribute('method', options.method);
						}
					}
				}

				dfd._originalTarget = targetNode ? targetNode.value : null;
				if(targetNode){
					targetNode.value = iframe._iframeName;
				}else{
					formNode.setAttribute('target', iframe._iframeName);
				}
				formNode.target = iframe._iframeName;

				notify && notify.emit('send', response, dfd.promise.cancel);
				iframe._notifyStart(response);
				formNode.submit();
			}else{
				// otherwise we post a GET string by changing URL location for the
				// iframe

				var extra = '';
				if(response.options.data){
					extra = response.options.data;
					if(typeof extra !== 'string'){
						extra = ioQuery.objectToQuery(extra);
					}
				}
				var tmpUrl = response.url + (response.url.indexOf('?') > -1 ? '&' : '?') + extra;
				notify && notify.emit('send', response, dfd.promise.cancel);
				iframe._notifyStart(response);
				iframe.setSrc(iframe._frame, tmpUrl, true);
			}
		}catch(e){
			dfd.reject(e);
		}
	}

	// dojo/request/watch handlers
	function isValid(response){
		return !this.isFulfilled();
	}
	function isReady(response){
		return !!this._finished;
	}
	function handleResponse(response, error){
		if(!error){
			try{
				var options = response.options,
					doc = iframe.doc(iframe._frame),
					handleAs = options.handleAs;

				if(handleAs !== 'html'){
					if(handleAs === 'xml'){
						// IE6-8 have to parse the XML manually. See http://bugs.dojotoolkit.org/ticket/6334
						if(doc.documentElement.tagName.toLowerCase() === 'html'){
							query('a', doc.documentElement).orphan();
							var xmlText = doc.documentElement.innerText;
							xmlText = xmlText.replace(/>\s+</g, '><');
							response.text = lang.trim(xmlText);
						}else{
							response.data = doc;
						}
					}else{
						// 'json' and 'javascript' and 'text'
						response.text = doc.getElementsByTagName('textarea')[0].value; // text
					}
					handlers(response);
				}else{
					response.data = doc;
				}
			}catch(e){
				error = e;
			}
		}

		if(error){
			this.reject(error);
		}else if(this._finished){
			this.resolve(response);
		}else{
			this.reject(new Error('Invalid dojo/request/iframe request state'));
		}
	}
	function last(response){
		this._callNext();
	}

	var defaultOptions = {
		method: 'POST'
	};
	function iframe(url, options, returnDeferred){
		var response = util.parseArgs(url, util.deepCreate(defaultOptions, options), true);
		url = response.url;
		options = response.options;

		if(options.method !== 'GET' && options.method !== 'POST'){
			throw new Error(options.method + ' not supported by dojo/request/iframe');
		}

		if(!iframe._frame){
			iframe._frame = iframe.create(iframe._iframeName, onload + '();');
		}

		var dfd = util.deferred(response, null, isValid, isReady, handleResponse, last);
		dfd._callNext = function(){
			if(!this._calledNext){
				this._calledNext = true;
				iframe._currentDfd = null;
				iframe._fireNextRequest();
			}
		};
		dfd._legacy = returnDeferred;

		iframe._dfdQueue.push(dfd);
		iframe._fireNextRequest();

		watch(dfd);

		return returnDeferred ? dfd : dfd.promise;
	}

	/*=====
	iframe = function(url, options){
		// summary:
		//		Sends a request using an iframe element with the given URL and options.
		// url: String
		//		URL to request
		// options: dojo/request/iframe.__Options?
		//		Options for the request.
		// returns: dojo/request.__Promise
	};
	iframe.__BaseOptions = declare(request.__BaseOptions, {
		// form: DOMNode?
		//		A form node to use to submit data to the server.
		// data: String|Object?
		//		Data to transfer. When making a GET request, this will
		//		be converted to key=value parameters and appended to the
		//		URL.
	});
	iframe.__MethodOptions = declare(null, {
		// method: String?
		//		The HTTP method to use to make the request. Must be
		//		uppercase. Only `"GET"` and `"POST"` are accepted.
		//		Default is `"POST"`.
	});
	iframe.__Options = declare([iframe.__BaseOptions, iframe.__MethodOptions]);

	iframe.get = function(url, options){
		// summary:
		//		Send an HTTP GET request using an iframe element with the given URL and options.
		// url: String
		//		URL to request
		// options: dojo/request/iframe.__BaseOptions?
		//		Options for the request.
		// returns: dojo/request.__Promise
	};
	iframe.post = function(url, options){
		// summary:
		//		Send an HTTP POST request using an iframe element with the given URL and options.
		// url: String
		//		URL to request
		// options: dojo/request/iframe.__BaseOptions?
		//		Options for the request.
		// returns: dojo/request.__Promise
	};
	=====*/
	iframe.create = create;
	iframe.doc = doc;
	iframe.setSrc = setSrc;

	// TODO: Make these truly private in 2.0
	iframe._iframeName = mid + '_IoIframe';
	iframe._notifyStart = function(){};
	iframe._dfdQueue = [];
	iframe._currentDfd = null;
	iframe._fireNextRequest = fireNextRequest;

	util.addCommonMethods(iframe, ['GET', 'POST']);

	return iframe;
});
