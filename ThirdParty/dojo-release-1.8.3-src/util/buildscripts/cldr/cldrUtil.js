(function(){
	// monkey patch fromJson to avoid Rhino bug in eval: https://bugzilla.mozilla.org/show_bug.cgi?id=471005
	var fromJson = dojo.fromJson;
	dojo.fromJson = function(json){
		json = json.replace(/[\u200E\u200F\u202A-\u202E]/g, function(match){
			return "\\u" + match.charCodeAt(0).toString(16);
		})
		return json ? fromJson(json) : ""; //TODO: json value passed in shouldn't be empty
	}
})();

function isLocaleAliasSrc(prop, bundle){
	if(!bundle){ return false; }
	var isAlias = false;
	var LOCALE_ALIAS_MARK = '@localeAlias';

	for(x in bundle){
		if(x.indexOf(LOCALE_ALIAS_MARK) > 0){
			var prefix = x.substring(0,x.indexOf(LOCALE_ALIAS_MARK));
			if(prop.indexOf(prefix) == 0){
				isAlias = true;
			}
		}
	}
	return isAlias;
}

function getNativeBundle(filePath){
	// summary:
	//		get native bundle content with utf-8 encoding.
	//		native means the content of this bundle is not flattened with parent.
	//		returns empty object if file not found.
	try{
		var content = readFile(filePath, "utf-8");
		return (!content || !content.length) ? {} : dojo.fromJson(content);
	}catch(e){
		return {};
	}
}

function compare(a/*String or Array*/, b/*String or Array*/){
	// summary:
	//		simple comparison
	if(dojo.isArray(a) && dojo.isArray(b)){
		for(var i = 0; i < a.length; i++){
			if(a[i] != b[i]){ return false; }
		}
		return true;
	}
	return a==b;
}
