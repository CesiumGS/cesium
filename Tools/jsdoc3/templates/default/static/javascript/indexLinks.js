(function() {
	var allLink = document.getElementById("allLink");
	var jsLink = document.getElementById("jsIndexLink");
	var glslLink = document.getElementById("glslIndexLink");
	var filterType = document.getElementById("filterType");
	var filterForm = document.getElementById("ClassFilter");
	var all = "all";
	var js = "js";
	var glsl = "glsl";
		
	var resetFilter = function() {
		document.filterForm.classFilter.value = '';
		codeview.filter('');
	}
	
	function showAll() {
		document.getElementById("glslItems").style.display = "block";
		document.getElementById("classItems").style.display = "block";
		filterType.value = all;
	}
	
	function showJs() {
		document.getElementById("glslItems").style.display = "none";
		document.getElementById("classItems").style.display = "block";
		filterType.value = js;
	}
	
	function showGlsl() {
		document.getElementById("glslItems").style.display = "block";
		document.getElementById("classItems").style.display = "none";
		filterType.value = glsl;		
	}
	
	allLink.onclick = function() {
		resetFilter();
		showAll();
	}
	
	jsLink.onclick = function() {
		resetFilter();
		showJs();
	}
	
	glslLink.onclick = function() {
		resetFilter();
		showGlsl();
	}
	
	if (filterType.value === js) {
		showJs();
	} else if (filterType.value === glsl) {
		showGlsl();
	} else {
		showAll();
	}
})();	