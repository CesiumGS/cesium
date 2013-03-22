(function(){
var file;
var head = document.documentElement.firstChild;
while(head && head.tagName != "HEAD"){
	head = head.nextSibling;
}
var script = head.lastChild;
while(script){
	if(script.tagName == "SCRIPT"){
		if((script.getAttribute('src')||'').search('_loadTest') >= 0 && (!script.readyState || script.readyState == "interactive")){
			file = script.getAttribute('file');
			break;
		}
	}
	script = script.previousSibling;
}
if(!file && window.location.href.search(/[?&]file[=]/i) > 0){
	file = window.location.href.replace(/.*[?&]file=(([^&?]*)).*/i, "$2");
}
var readFile = function(file){
	var xhr = null;
	try{
		xhr = new XMLHttpRequest();
	}catch(e0){
		try{
			xhr = new ActiveXObject('Msxml2.XMLHTTP');
		}catch(e1){
			try{
				xhr = new ActiveXObject('Microsoft.XMLHTTP');
			}catch(e2){
				try{
					xhr = new ActiveXObject('Msxml2.XMLHTTP.4.0');
				}catch(e3){
				}
			}
		}
	}
	try{
		xhr.open("GET", file, false);
		xhr.send(null);
	}catch(e){
		return null
	} // file not found
	return xhr.responseText;
};
var text = readFile(file) || (file + " not found");
var baseHref = file.replace(/^(.*\/)?[^\/]+$/, "$1");
if(baseHref){
	baseHref = window.location.href.replace(/[?].*/, "").replace(/[^\/]*$/, "")+baseHref;
	text = text.replace(/(<HEAD\b([^>]|\s)*>)/i, "$1" + "<BASE href='" + baseHref + "'><\/BASE>");
}
// strip DOCTYPE and HTML tag
text = text.replace(/^(.|\s)*?<html\b(([^>]|\s)*)>((.|\s)*)/i,
	function(s,a1,htmlAttrs,a3,content){
		// add attributes from target file's HTML tag - may not be necessary but we'll do it anyway for completeness
		htmlAttrs = htmlAttrs.replace(/((\w+)\s*=\s*(['"]?)(.*?)(\3)?(\s+|$))/g,
			function(s, all, attr, quote, val){
				document.documentElement.setAttribute(attr, val);
				return "";
			});
		return content.replace(/<\/html\b([^>]|\s)*>(.|\s)*?$/i, "");
	});
if(/MSIE/.test(navigator.userAgent)){ // need to load scripts serially
	document._oldgetElementsByTagName_ = document.getElementsByTagName;
	document.getElementsByTagName = function(tag){
		// take over getElementsByTagName so I can take over script.getAttribute('src')
		if(/^script$/i.test(tag)){
			var scripts = document.scripts;
			for(var i=0; i <scripts.length; i++){
				(function(script){
					if(!('_oldGetAttribute' in script)){
						var src = script.getAttribute('_oldsrc');
						if(src){
							script._oldGetAttribute = script.getAttribute;
							script.getAttribute = function(attr){ return /^src$/i.test(attr) ? src : script._oldGetAttribute(attr); };
						}
					}
				}).call(this, scripts[i]);
			}
			return scripts;
		}
		return document._oldgetElementsByTagName_(tag);
	};
	document._oldwrite_ = document.write;
	document.write = function(text){
		text = text.replace(/<[!][-][-](.|\s){5,}?[-][-]>/g, "<!--?-->" // shorten long comments that may contain script tags
			).replace(/(<script\s[^>]*)\bsrc\s*=\s*([^>]*>)/ig,
		function(s,pre,post){
			if(s.search(/\sdefer\b/i) > 0){ return s; }
			//if(s.search(/\bxpopup.js\b/i) > 0){ return pre+">"; } // firewall popup blocker:  uncomment if you get out of stack space message
			var file = post.substr(0, post.search(/\s|>/)).replace(/['"]/g, "");
			var scriptText = readFile(baseHref+file);
			if(!scriptText){
				scriptText = readFile(file);
				if(!scriptText){ return s; }
			}
			return pre + "  _oldsrc=" + post + "eval(unescape('"+escape(scriptText)+"'))";
		});
		document._oldwrite_(text);
	};
}
document.write(text);
})();
