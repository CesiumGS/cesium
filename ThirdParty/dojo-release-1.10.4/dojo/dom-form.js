define(["./_base/lang", "./dom", "./io-query", "./json"], function(lang, dom, ioq, json){
	// module:
	//		dojo/dom-form

    function setValue(/*Object*/ obj, /*String*/ name, /*String*/ value){
        // summary:
        //		For the named property in object, set the value. If a value
        //		already exists and it is a string, convert the value to be an
        //		array of values.

        // Skip it if there is no value
        if(value === null){
            return;
        }

        var val = obj[name];
        if(typeof val == "string"){ // inline'd type check
            obj[name] = [val, value];
        }else if(lang.isArray(val)){
            val.push(value);
        }else{
            obj[name] = value;
        }
    }

	var exclude = "file|submit|image|reset|button";

	var form = {
		// summary:
		//		This module defines form-processing functions.

		fieldToObject: function fieldToObject(/*DOMNode|String*/ inputNode){
			// summary:
			//		Serialize a form field to a JavaScript object.
			// description:
			//		Returns the value encoded in a form field as
			//		as a string or an array of strings. Disabled form elements
			//		and unchecked radio and checkboxes are skipped.	Multi-select
			//		elements are returned as an array of string values.
			// inputNode: DOMNode|String
			// returns: Object

			var ret = null;
			inputNode = dom.byId(inputNode);
			if(inputNode){
				var _in = inputNode.name, type = (inputNode.type || "").toLowerCase();
				if(_in && type && !inputNode.disabled){
					if(type == "radio" || type == "checkbox"){
						if(inputNode.checked){
							ret = inputNode.value;
						}
					}else if(inputNode.multiple){
						ret = [];
						var nodes = [inputNode.firstChild];
						while(nodes.length){
							for(var node = nodes.pop(); node; node = node.nextSibling){
								if(node.nodeType == 1 && node.tagName.toLowerCase() == "option"){
									if(node.selected){
										ret.push(node.value);
									}
								}else{
									if(node.nextSibling){
										nodes.push(node.nextSibling);
									}
									if(node.firstChild){
										nodes.push(node.firstChild);
									}
									break;
								}
							}
						}
					}else{
						ret = inputNode.value;
					}
				}
			}
			return ret; // Object
		},

		toObject: function formToObject(/*DOMNode|String*/ formNode){
			// summary:
			//		Serialize a form node to a JavaScript object.
			// description:
			//		Returns the values encoded in an HTML form as
			//		string properties in an object which it then returns. Disabled form
			//		elements, buttons, and other non-value form elements are skipped.
			//		Multi-select elements are returned as an array of string values.
			// formNode: DOMNode|String
			// example:
			//		This form:
			//		|	<form id="test_form">
			//		|		<input type="text" name="blah" value="blah">
			//		|		<input type="text" name="no_value" value="blah" disabled>
			//		|		<input type="button" name="no_value2" value="blah">
			//		|		<select type="select" multiple name="multi" size="5">
			//		|			<option value="blah">blah</option>
			//		|			<option value="thud" selected>thud</option>
			//		|			<option value="thonk" selected>thonk</option>
			//		|		</select>
			//		|	</form>
			//
			//		yields this object structure as the result of a call to
			//		formToObject():
			//
			//		|	{
			//		|		blah: "blah",
			//		|		multi: [
			//		|			"thud",
			//		|			"thonk"
			//		|		]
			//		|	};

			var ret = {}, elems = dom.byId(formNode).elements;
			for(var i = 0, l = elems.length; i < l; ++i){
				var item = elems[i], _in = item.name, type = (item.type || "").toLowerCase();
				if(_in && type && exclude.indexOf(type) < 0 && !item.disabled){
					setValue(ret, _in, form.fieldToObject(item));
					if(type == "image"){
						ret[_in + ".x"] = ret[_in + ".y"] = ret[_in].x = ret[_in].y = 0;
					}
				}
			}
			return ret; // Object
		},

		toQuery: function formToQuery(/*DOMNode|String*/ formNode){
			// summary:
			//		Returns a URL-encoded string representing the form passed as either a
			//		node or string ID identifying the form to serialize
			// formNode: DOMNode|String
			// returns: String

			return ioq.objectToQuery(form.toObject(formNode)); // String
		},

		toJson: function formToJson(/*DOMNode|String*/ formNode, /*Boolean?*/ prettyPrint){
			// summary:
			//		Create a serialized JSON string from a form node or string
			//		ID identifying the form to serialize
			// formNode: DOMNode|String
			// prettyPrint: Boolean?
			// returns: String

			return json.stringify(form.toObject(formNode), null, prettyPrint ? 4 : 0); // String
		}
	};

    return form;
});
