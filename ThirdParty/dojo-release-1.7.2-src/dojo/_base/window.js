define(["./kernel", "../has", "./sniff"], function(dojo, has){
	// module:
	//		dojo/window
	// summary:
	//		This module provides an API to save/set/restore the global/document scope.

/*=====
dojo.doc = {
	// summary:
	//		Alias for the current document. 'dojo.doc' can be modified
	//		for temporary context shifting. Also see dojo.withDoc().
	// description:
	//		Refer to dojo.doc rather
	//		than referring to 'window.document' to ensure your code runs
	//		correctly in managed contexts.
	// example:
	//	|	n.appendChild(dojo.doc.createElement('div'));
}
=====*/
dojo.doc = this["document"] || null;

dojo.body = function(){
	// summary:
	//		Return the body element of the document
	//		return the body object associated with dojo.doc
	// example:
	//	|	dojo.body().appendChild(dojo.doc.createElement('div'));

	// Note: document.body is not defined for a strict xhtml document
	// Would like to memoize this, but dojo.doc can change vi dojo.withDoc().
	return dojo.doc.body || dojo.doc.getElementsByTagName("body")[0]; // Node
};

dojo.setContext = function(/*Object*/globalObject, /*DocumentElement*/globalDocument){
	// summary:
	//		changes the behavior of many core Dojo functions that deal with
	//		namespace and DOM lookup, changing them to work in a new global
	//		context (e.g., an iframe). The varibles dojo.global and dojo.doc
	//		are modified as a result of calling this function and the result of
	//		`dojo.body()` likewise differs.
	dojo.global = ret.global = globalObject;
	dojo.doc = ret.doc = globalDocument;
};

dojo.withGlobal = function(	/*Object*/globalObject,
							/*Function*/callback,
							/*Object?*/thisObject,
							/*Array?*/cbArguments){
	// summary:
	//		Invoke callback with globalObject as dojo.global and
	//		globalObject.document as dojo.doc.
	// description:
	//		Invoke callback with globalObject as dojo.global and
	//		globalObject.document as dojo.doc. If provided, globalObject
	//		will be executed in the context of object thisObject
	//		When callback() returns or throws an error, the dojo.global
	//		and dojo.doc will be restored to its previous state.

	var oldGlob = dojo.global;
	try{
		dojo.global = ret.global = globalObject;
		return dojo.withDoc.call(null, globalObject.document, callback, thisObject, cbArguments);
	}finally{
		dojo.global = ret.global = oldGlob;
	}
};

dojo.withDoc = function(	/*DocumentElement*/documentObject,
							/*Function*/callback,
							/*Object?*/thisObject,
							/*Array?*/cbArguments){
	// summary:
	//		Invoke callback with documentObject as dojo.doc.
	// description:
	//		Invoke callback with documentObject as dojo.doc. If provided,
	//		callback will be executed in the context of object thisObject
	//		When callback() returns or throws an error, the dojo.doc will
	//		be restored to its previous state.

	var oldDoc = dojo.doc,
		oldQ = dojo.isQuirks,
		oldIE = dojo.isIE, isIE, mode, pwin;

	try{
		dojo.doc = ret.doc = documentObject;
		// update dojo.isQuirks and the value of the has feature "quirks"
		dojo.isQuirks = has.add("quirks", dojo.doc.compatMode == "BackCompat", true, true); // no need to check for QuirksMode which was Opera 7 only

		if(has("ie")){
			if((pwin = documentObject.parentWindow) && pwin.navigator){
				// re-run IE detection logic and update dojo.isIE / has("ie")
				// (the only time parentWindow/navigator wouldn't exist is if we were not
				// passed an actual legitimate document object)
				isIE = parseFloat(pwin.navigator.appVersion.split("MSIE ")[1]) || undefined;
				mode = documentObject.documentMode;
				if(mode && mode != 5 && Math.floor(isIE) != mode){
					isIE = mode;
				}
				dojo.isIE = has.add("ie", isIE, true, true);
			}
		}

		if(thisObject && typeof callback == "string"){
			callback = thisObject[callback];
		}

		return callback.apply(thisObject, cbArguments || []);
	}finally{
		dojo.doc = ret.doc = oldDoc;
		dojo.isQuirks = has.add("quirks", oldQ, true, true);
		dojo.isIE = has.add("ie", oldIE, true, true);
	}
};

var ret = {
	global: dojo.global,
	doc: dojo.doc,
	body: dojo.body,
	setContext: dojo.setContext,
	withGlobal: dojo.withGlobal,
	withDoc: dojo.withDoc
};

return ret;

});
