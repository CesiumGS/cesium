dojo.provide("dojox.dtl.tests.dom.util");

dojo.require("dojox.dtl.dom");
dojo.require("dojox.dtl.render.dom");
dojo.require("dojox.string.Builder");

dojox.dtl.DomBuffer.prototype.onClone = function(from, to){
	var clones = this._clones = this._clones || [];

	for(var i = 0, group; group = clones[i]; i++){
		for(var j = 0, item; item = group[j]; j++){
			if(item === from){
				group.push(to);
				return
			}else if(item === to){
				group.push(from);
				return;
			}
		}
	}

	clones.push([from, to]);
}
dojox.dtl.DomBuffer.prototype.onAddEvent = function(node, type, description){
	var events = this._events = this._events || [];

	var found = false;
	for(var i = 0, evt; evt = events[i]; i++){
		if(evt[0] === node){
			found = true;
			evt[1] = type;
			evt[2] = description;
		}
	}

	if(!found){
		events.push([node, type, description]);
	}
}

dojox.dtl.tests.dom.util.render = function(/*DomTemplate*/ template, /*Context*/ context) {
	try {
		var div = document.createElement("div");
		dojo.style(div, "visibility", "hidden");
		var attach = document.createElement("div");
		div.appendChild(attach);
		dojo.body().appendChild(div);

		var buffer = template.getBuffer();
		var canvas = new dojox.dtl.render.dom.Render(attach, template);
		canvas.render(context, template, buffer);
		var clones = buffer._clones;
		var events = buffer._events;

		var first = dojox.dtl.tests.dom.util.serialize(canvas.domNode, template.tokens, clones, events).toString();

		buffer = template.getBuffer();
		buffer._clones = clones;
		buffer._events = events;
		canvas.render(context, template, buffer);

		var second = dojox.dtl.tests.dom.util.serialize(canvas.domNode, template.tokens, clones, events).toString();

		doh.is("Compare re-render: " + first, "Compare re-render: " + second);
		return first;
	}
	catch(e){
		throw e;
	}finally{
		div.parentNode.removeChild(div);
	}
}

dojox.dtl.tests.dom.util.serialize = function(node, tokens, clones, events, output) {
	var types = dojox.dtl.dom.types;
	clones = clones || [];
	events = events || [];

	if (node.nodeType == 3) {
		output.append(node.nodeValue);
	}else{
		var name = node.nodeName.toLowerCase();
		if(!name){ return; }

		if (!output) {
			output = new dojox.string.Builder();
		}
		output.append("<").append(name);

		var found = {};
		var attributes = dojo.filter(tokens, function(item){
			return item[0] == dojox.dtl.TOKEN_ATTR && dojo.isString(item[3]) && dojo.trim(item[3]);
		});
		attributes = dojo.map(attributes, "return item[2];");
		attributes = dojo.filter(attributes, function(attribute){
			if(!found[attribute]){
				return found[attribute] = true;
			}
		});

		for(var i = 0, attribute; attribute = attributes[i]; i++){
			var value = "";
			if(attribute == "class"){
				value = node.className || value;
			}else if(attribute == "for"){
				value = node.htmlFor || value;
			}else{
				var bools = {checked: 1, disabled: 1, readonly: 1};
				if(bools[attribute] && typeof node[attribute] == "boolean"){
					value = dojo.attr(node, attribute) ? "true" : "false";
				}else{
					value = node.getAttribute(attribute, 2) || value;
				}
				if(node.tagName == "TEXTAREA" && (attribute == "type" || attribute == "value")){
					continue;
				}
				if(node.tagName == "INPUT" && attribute == "type" && value == "text"){
					continue;
				}
				if(dojo.isIE && (attribute == "href" || attribute == "src")){
					var hash = location.href.lastIndexOf(location.hash);
					var href = location.href.substring(0, hash).split("/");
					href.pop();
					href = href.join("/") + "/";
					if(value.indexOf(href) == 0){
						value = value.replace(href, "");
					}
					value = decodeURIComponent(value);
				}
			}
			if(value !== ""){
				output.append(" ").append(attribute).append('="').append(value.replace(/"/g, '\\"')).append('"');
			}
		}

		// Deal with events
		if(events){
			for(var i = 0, evt; evt = events[i]; i++){
				if(evt[0] === node){
					output.append(" ").append(evt[1]).append('="').append(evt[2]).append('"');
				}
			}
		}

		if(!node.childNodes.length){
			output.append("/>");
		}else{
			output.append(">");
			dojo.forEach(node.childNodes, function(node){
				dojox.dtl.tests.dom.util.serialize(node, tokens, clones, events, output);
			});
			output.append("</").append(name).append(">");
		}

		return output;
	}
}