dojo.provide("dojox.xmpp.util");
dojo.require("dojox.string.Builder");
dojo.require("dojox.encoding.base64");

dojox.xmpp.util.xmlEncode = function(str) {
	if(str) {
		str = str.replace("&", "&amp;").replace(">", "&gt;").replace("<", "&lt;").replace("'", "&apos;").replace('"', "&quot;");
	}
	return str;
}

dojox.xmpp.util.encodeJid = function(jid) {
		var buffer = new dojox.string.Builder();
		for(var i =0; i < jid.length; i++) {
			var ch = jid.charAt(i);
			var rep = ch;
			switch(ch){
				case ' ' :
					rep = "\\20";
				break;
				case '"' :
					rep = "\\22";
				break;
				case '#' :
					rep = "\\23";
				break;
				case '&' :
					rep = "\\26";
				break;
				case "'" :
					rep = "\\27";
				break;
				case '/' :
					rep = "\\2f";
				break;
				case ':' :
					rep = "\\3a";
				break;
				case '<' :
					rep = "\\3c";
				break;
				case '>' :
					rep = "\\3e";
				break;
			}
			buffer.append(rep);
		}
		return buffer.toString();
	}

dojox.xmpp.util.decodeJid = function(jid) {
	
	jid = jid.replace(/\\([23][02367acef])/g, function(match) {
			switch(match){
				case "\\20" :
					return  ' ';
				case "\\22"  :
					return '"';
				case "\\23" :
					return '#' ;
				case "\\26" :
					return  '&';
				case "\\27" :
					return   "'";
				case "\\2f" :
					return  '/';
				case "\\3a" :
					return ':' ;
				case "\\3c" :
					return  '<';
				case "\\3e" :
					return  '>';
			}
			return "ARG";
	});
	
	return jid;
}


dojox.xmpp.util.createElement = function(tag, attributes, terminal){
	var elem = new dojox.string.Builder("<");
	elem.append(tag + " ");

	for (var attr in attributes){
		elem.append(attr + '="');
		elem.append(attributes[attr]);
		elem.append('" ');
	}
	
	if (terminal){
		elem.append("/>");
	}else{
		elem.append(">");
	}

	return elem.toString();
}

dojox.xmpp.util.stripHtml = function(str){
	// summary
	//		Strips all HTML, including attributes and brackets
	//		| <div onmouse="doBadThing()">Click <b>Me</b></div>
	//		| becomes: Click Me
	var re=/<[^>]*?>/gi;
	for (var i=0; i<arguments.length; i++) {}
	return str.replace(re, "");
}

dojox.xmpp.util.decodeHtmlEntities = function(str){
	// Summary: decodes HTML entities to js characters so the string can be
	// fed to a textarea.value
	var ta = dojo.doc.createElement("textarea");
	ta.innerHTML = str.replace(/</g,"&lt;").replace(/>/g,"&gt;");
	return ta.value;
}

dojox.xmpp.util.htmlToPlain = function(str){
	str = dojox.xmpp.util.decodeHtmlEntities(str);
	str = str.replace(/<br\s*[i\/]{0,1}>/gi,"\n");
	str = dojox.xmpp.util.stripHtml(str);
	return str;
}

dojox.xmpp.util.Base64 = {};

dojox.xmpp.util.Base64.encode = function(input){
	var s2b = function(s){
		var b = [];
		for(var i = 0; i < s.length; ++i){
			b.push(s.charCodeAt(i));
		}
		return b;
	};
	return dojox.encoding.base64.encode(s2b(input));
}


dojox.xmpp.util.Base64.decode = function(input){
	var b2s = function(b){
		var s = [];
		dojo.forEach(b, function(c){ s.push(String.fromCharCode(c)); });
		return s.join("");
	};
	return b2s(dojox.encoding.base64.decode(input));
}
