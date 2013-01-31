dojo.provide("dojox.rails");
dojo.require("dojo.NodeList-traverse");

dojox.rails.live = function(selector, evtName, fn){
	if (dojo.isIE && evtName.match(/^(on)?submit$/i)){
		dojox.rails.live(selector, "click", function(evt){
			var target = evt.target, tag = target.tagName.toLowerCase();
			if ((tag == "input" || tag == "button") && dojo.attr(target, "type").toLowerCase() == "submit"){
				 var form = dojo.query(target).closest("form");
				 if (form.length){
					var h = dojo.connect(form[0], "submit", function(evt){
					 	dojo.disconnect(h);
					 	fn.call(evt.target, evt);
				 	});
				}
			}
		});
	}else{
		dojo.connect(dojo.body(), evtName, function(evt){
			var nl = dojo.query(evt.target).closest(selector);
			if (nl.length){
				fn.call(nl[0], evt);
			}
		});
	}
};

dojo.ready((function(d, dr, dg){
	return function() {
		var q = d.query, live = dr.live,
				csrfToken = q("meta[name=csrf-token]").attr("content"),
		    csrfParam = q("meta[name=csrf-param]").attr("content");

		var createFormForLink = function(url, method){
			var form = '<form style="display:none" method="post" action="'+ url +'">' +
				'<input type="hidden" name="_method" value="'+ method +'" />' +
				'<input type="hidden" name="'+ csrfParam +'" value="'+ csrfToken +'" />' +
				'</form>';
			return dojo.place(form, dojo.body());
		};

		var disable = function(elements){
			d.forEach(elements, function(node){
				if (!d.attr(node, "disabled")){
					var attr = node.tagName.toLowerCase() == "input" ? "value" : "innerHTML";
					var message = d.attr(node, "data-disable-with");
					var originalValue = d.attr(node, attr);
					d.attr(node, "disabled", true);
					d.attr(node, "data-original-value", originalValue);
					d.attr(node, attr, message);
				}
			});
		};

		var typeMap = {
			"text":                  "text",
			"json":                  "application/json",
			"json-comment-optional": "text",
			"json-comment-filtered": "text",
			"javascript":            "application/javascript",
			"xml":                   "text/xml"
		};

		var handleRemote = function(evt){
			var el = evt.target, tag = el.tagName.toLowerCase();
			var content = tag.toLowerCase() == "form" ? d.formToObject(el) : {},
					type   =  d.attr(el, "data-type") || "javascript",
					method = (d.attr(el, "method")    || d.attr(el, "data-method") || "get").toLowerCase(),
					url    =  d.attr(el, "action")    || d.attr(el, "href");

			if (tag != "form" && method != "get"){
					el = createFormForLink(url, method);
					method = "POST";
			}
			evt.preventDefault();


			// ajax:loading, ajax:loaded, and ajax:interactive are not supported
			d.publish("ajax:before", [el]);
			var deferred = d.xhr(method, {
				url:      url,
				headers:  { "Accept": typeMap[type] },
				content:  content,
				handleAs: type,
				load:		  function(response, ioArgs) {d.publish("ajax:success",	 [el, response, ioArgs]);},
				error:	  function(response, ioArgs) {d.publish("ajax:failure",  [el, response, ioArgs]);},
				handle:   function(response, ioArgs) {d.publish("ajax:complete", [el, response, ioArgs]);}
			});
			d.publish("ajax:after", [el]);
		};

		var handleEnable	= function(el){
			q("*[data-disable-with][disabled]", el).forEach(function(node){
				var attr = node.tagName.toLowerCase() == "input" ? "value" : "innerHTML";
				var value = d.attr(node, "data-original-value");
				d.attr(node, "disabled", false);
				d.attr(node, "data-original-value", null);
				d.attr(node, attr, value);
			});
		};

		var handleDataMethod = function(evt){
			var el = evt.target, form = createFormForLink(el.href, dojo.attr(el, "data-method"));
			evt.preventDefault();
			form.submit();
		};

		var handleFormSubmit = function(evt){
			var el = evt.target, elements = q("*[data-disable-with]", el);
			if (elements.length){ disable(elements); }
			if (d.attr(el, "data-remote")){
				evt.preventDefault();
				handleRemote(evt);
 			}
		};

		var handleConfirm = function(evt){
			var proceed = dg.confirm(d.attr(evt.target, "data-confirm"));
			if (!proceed){
				evt.preventDefault();
			}else if (d.attr(evt.target, "data-remote")){
				handleRemote(evt);
			}
		};

		// Register data-{action} elements.	 Order is important since the return values
		// from previously called functions in the connect chain influence whether
		// or not the next function in the chain is called.

		// Register data-confirm elements
		live("*[data-confirm]", "click", handleConfirm);

		// data-disable-with only applies to forms
		d.subscribe("ajax:complete", handleEnable);

		// Register data-remote elements
		live("a[data-remote]:not([data-confirm])", "click", handleRemote);
		live("a[data-method]:not([data-remote])", "click", handleDataMethod);

		// Handle form submits
		live("form", "submit", handleFormSubmit);
	};
})(dojo, dojox.rails, dojo.global));
