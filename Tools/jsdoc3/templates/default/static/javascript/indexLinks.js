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

	var updateMenuLinks = function() {
		var links = document.getElementById("ClassList").getElementsByTagName('a');
		var searchTerm = document.getElementById('ClassFilter').value; 
		var show = document.getElementById('filterType').value; 
		for (var i = 0; i < links.length; i++) {
			var prefix = links[i].href.split('?')[0];
			links[i].href = prefix + '?classFilter=' + searchTerm + '&show=' + show;
		}
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
		updateMenuLinks();
	}
	
	jsLink.onclick = function() {
		resetFilter();
		showJs();
		updateMenuLinks();
	}
	
	glslLink.onclick = function() {
		resetFilter();
		showGlsl();
		updateMenuLinks();
	}
	
	var menuLinks = document.getElementById("ClassList").getElementsByTagName('a');
	for (var i = 0; i < menuLinks.length; i++) {
		menuLinks[i].onclick = function() {
			updateMenuLinks();
		}
	}
	
	if (filterType.value === js) {
		showJs();
	} else if (filterType.value === glsl) {
		showGlsl();
	} else {
		showAll();
	}
})();	