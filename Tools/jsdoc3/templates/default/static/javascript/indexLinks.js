(function () {
	var allLink = document.getElementById("allLink");
	var jsLink = document.getElementById("jsIndexLink");
	var glslLink = document.getElementById("glslIndexLink");
	var filterType = document.getElementById("filterType");
	var allCookie = "all";
	var jsCookie = "js";
	var glslCookie = "glsl";
	
	function showAll() {
		document.getElementById("glslItems").style.display = "block";
		document.getElementById("classItems").style.display = "block";
		document.cookie = allCookie;
	}
	
	function showJs() {
		document.getElementById("glslItems").style.display = "none";
		document.getElementById("classItems").style.display = "block";
		document.cookie = jsCookie;
	}
	
	function showGlsl() {
		document.getElementById("glslItems").style.display = "block";
		document.getElementById("classItems").style.display = "none";
		document.cookie = glslCookie;
	}
	
	allLink.onclick = function() {
		showAll();
	}
	
	jsLink.onclick = function() {
		showJs();
	}
	
	glslLink.onclick = function() {
		showGlsl();
	}
	
	if( document.cookie === jsCookie) {
		showJs();
	} else if ( document.cookie === glslCookie) {
		showGlsl();
	} else {
		showAll();
	}

})();