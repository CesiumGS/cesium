function getJsonpCallback(url){
	var result = null;
	var idMatch = url.match(/jsonp=(.*?)(&|$)/);
	if(idMatch){
		result = idMatch[1];
	}else{
		//jsonp didn't match, so maybe it is the jsonCallback thing.
		idMatch = url.match(/callback=(.*?)(&|$)/);
		if(idMatch){
			result = idMatch[1];
		}
	}
	
	if(result){
		result = decodeURIComponent(result);
	}
	return result;
}

function findJsonpDone(){
	var result = false;
	var scriptUrls = getScriptUrls();
	
	for(var i = 0; i < scriptUrls.length; i++){
		var jsonp = getJsonpCallback(scriptUrls[i]);
		if(jsonp){
			eval(jsonp + "({animalType: 'mammal'});");
			result = true;
			break;
		}
	}
	return result;
}

function getScriptUrls(){
	//Get the script tags in the page to figure what state we are in.
	var scripts = document.getElementsByTagName('script');
	var scriptUrls = new Array();
	for(var i = 0; scripts && i < scripts.length; i++){
		var scriptTag = scripts[i];
		if(scriptTag.id.indexOf("dojoIoScript") == 0){
			scriptUrls.push(scriptTag.src);
		}
	}

	return scriptUrls;
}

function doJsonpCallback(){
	if(!findJsonpDone()){
		 alert('ERROR: Could not jsonp callback!');
	}
}

//Set a timeout to do the callback check, since MSIE won't see the SCRIPT tag until
//we complete processing of this page.
setTimeout(function(){doJsonpCallback();}, 300);
