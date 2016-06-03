define(["./_base/lang", "./sniff"], function(lang, has){

// module:
//		dojo/gears

var gears = {
	// summary:
	//		TODOC
};
lang.setObject("dojo.gears", gears);

gears._gearsObject = function(){
	// summary:
	//		factory method to get a Google Gears plugin instance to
	//		expose in the browser runtime environment, if present
	var factory;

	var gearsObj = lang.getObject("google.gears");
	if(gearsObj){ return gearsObj; } // already defined elsewhere

	if(typeof GearsFactory != "undefined"){ // Firefox
		factory = new GearsFactory();
	}else{
		if(has("ie")){
			// IE
			try{
				factory = new ActiveXObject("Gears.Factory");
			}catch(e){
				// ok to squelch; there's no gears factory.  move on.
			}
		}else if(navigator.mimeTypes["application/x-googlegears"]){
			// Safari?
			factory = document.createElement("object");
			factory.setAttribute("type", "application/x-googlegears");
			factory.setAttribute("width", 0);
			factory.setAttribute("height", 0);
			factory.style.display = "none";
			document.documentElement.appendChild(factory);
		}
	}

	// still nothing?
	if(!factory){ return null; }

	// define the global objects now; don't overwrite them though if they
	// were somehow set internally by the Gears plugin, which is on their
	// dev roadmap for the future
	lang.setObject("google.gears.factory", factory);
	return lang.getObject("google.gears");
};


// see if we have Google Gears installed, and if
// so, make it available in the runtime environment
// and in the Google standard 'google.gears' global object
gears.available = (!!gears._gearsObject())||0;
/*=====
 gears.available = {
 // summary:
 //		True if client is using Google Gears
 };
 =====*/

return gears;
});
