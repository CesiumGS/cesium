define(["dojo/_base/kernel"], function(dojo){
dojo.getObject("io.httpParse", true, dojox);

dojox.io.httpParse = function(/*String*/httpStream, /*String?*/topHeaders,/*Boolean?*/ partial){
	// summary:
	//		Parses an HTTP stream for a message.
	// httpStream:
	//		HTTP stream to parse
	// topHeaders:
	//		Extra header information to add to each HTTP request (kind of HTTP inheritance)
	// partial:
	//		A true value indicates that the stream may not be finished, it may end arbitrarily in mid stream.
	//		The last XHR object will have a special property _lastIndex that indicates the how far along
	//		the httpStream could be successfully parsed into HTTP messages.
	// returns:
	//		Returns an array of XHR-like object for reading the headers for each message
	//
	var xhrs=[];
	var streamLength = httpStream.length;
	do{
		var headers = {};
		var httpParts = httpStream.match(/(\n*[^\n]+)/);
		if(!httpParts){
			return null;
		}
		httpStream = httpStream.substring(httpParts[0].length+1);
		httpParts = httpParts[1];
		var headerParts = httpStream.match(/([^\n]+\n)*/)[0];
		 
		httpStream = httpStream.substring(headerParts.length);
		var headerFollowingChar = httpStream.substring(0,1);
		httpStream = httpStream.substring(1);
		headerParts = (topHeaders || "") + headerParts;
		var headerStr = headerParts;
		headerParts = headerParts.match(/[^:\n]+:[^\n]+\n/g); // parse the containing and contained response headers with the contained taking precedence (by going last)
		for(var j = 0; j < headerParts.length; j++){
			var colonIndex = headerParts[j].indexOf(':');
			headers[headerParts[j].substring(0,colonIndex)] = headerParts[j].substring(colonIndex+1).replace(/(^[ \r\n]*)|([ \r\n]*)$/g,''); // trim
		}
	
		httpParts = httpParts.split(' ');
		var xhr = { // make it look like an xhr object, at least for the response part of the API
			status : parseInt(httpParts[1],10),
			statusText : httpParts[2],
			readyState : 3, // leave it at 3 until we get a full body
			getAllResponseHeaders : function(){
				return headerStr;
			},
			getResponseHeader : function(name){
				return headers[name];
			}
		};
		var contentLength = headers['Content-Length'];
		var content;
		if(contentLength){
			if(contentLength <= httpStream.length){
				content = httpStream.substring(0,contentLength);
			}else{
				return xhrs; // the content is not finished
			}
		}else if((content = httpStream.match(/(.*)HTTP\/\d\.\d \d\d\d[\w\s]*\n/))){ // assign content
			// if we spot another HTTP message coming up, we will just assign all the in between text to the content
			content = content[0];
		}else if(!partial || headerFollowingChar == '\n'){
			// if we have to finish
			content = httpStream;
		}else{
			return xhrs;
		}
		xhrs.push(xhr); // add it to the list, since it is a full HTTP message
		httpStream = httpStream.substring(content.length); // move along the stream
		xhr.responseText = content;
		xhr.readyState = 4;
		xhr._lastIndex = streamLength - httpStream.length; // need to pick up from where we left on streaming connections
	}while(httpStream);
	return xhrs;
};

return dojox.io.httpParse;

});
