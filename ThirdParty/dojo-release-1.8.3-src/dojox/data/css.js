define(["dojo/_base/lang", "dojo/_base/array"], 
  function(lang, array) {

var css = lang.getObject("dojox.data.css",true) 

css.rules = {};

css.rules.forEach = function(fn,ctx,context){
	if(context){
		var _processSS = function(styleSheet){
			//iterate across rules in the stylesheet
			array.forEach(styleSheet[styleSheet.cssRules?"cssRules":"rules"], function(rule){
				if(!rule.type || rule.type !== 3){// apply fn to current rule with approp ctx. rule is arg (all browsers)
					var href = "";
					if(styleSheet && styleSheet.href){
						href = styleSheet.href;
					}
					fn.call(ctx?ctx:this,rule, styleSheet, href);
				}
			});
			//process any child stylesheets
		};
		array.forEach(context,_processSS);
	}
};

css.findStyleSheets = function(sheets){
	// Takes an array of stylesheet paths and finds the currently loaded StyleSheet objects matching
	// those names
	var sheetObjects = [];
	var _processSS = function(styleSheet){
		var s = css.findStyleSheet(styleSheet);
		if(s){
			array.forEach(s, function(sheet){
				if(array.indexOf(sheetObjects, sheet) === -1){
					sheetObjects.push(sheet);
				}
			});
		}
	};
	array.forEach(sheets, _processSS);
	return sheetObjects;
};

css.findStyleSheet = function(sheet){
	// Takes a stylesheet path and finds the currently loaded StyleSheet objects matching
	// those names (and it's parent(s), if it is imported from another)
	var sheetObjects = [];
	if(sheet.charAt(0) === '.'){
		sheet = sheet.substring(1);
	}
	var _processSS = function(styleSheet){
		if(styleSheet.href && styleSheet.href.match(sheet)){
			sheetObjects.push(styleSheet);
			return true;
		}
		if(styleSheet.imports){
			return array.some(styleSheet.imports, function(importedSS){ //IE stylesheet has imports[] containing @import'ed rules
				//console.debug("Processing IE @import rule",importedSS);
				return _processSS(importedSS);
			});
		}
		//iterate across rules in the stylesheet
		return array.some(styleSheet[styleSheet.cssRules?"cssRules":"rules"], function(rule){
			if(rule.type && rule.type === 3 && _processSS(rule.styleSheet)){// CSSImportRule (firefox)
				//sheetObjects.push(styleSheet);
				return true;
			}
			return false;
		});
	};
	array.some(document.styleSheets, _processSS);
	return sheetObjects;
};

css.determineContext = function(initialStylesheets){
	// Takes an array of stylesheet paths and returns an array of all stylesheets that fall in the
	// given context.  If no paths are given, all stylesheets are returned.
	var ret = [];
	if(initialStylesheets && initialStylesheets.length > 0){
		initialStylesheets = css.findStyleSheets(initialStylesheets);
	}else{
		initialStylesheets = document.styleSheets;
	}
	var _processSS = function(styleSheet){
		ret.push(styleSheet);
		if(styleSheet.imports){
			array.forEach(styleSheet.imports, function(importedSS){ //IE stylesheet has imports[] containing @import'ed rules
				//console.debug("Processing IE @import rule",importedSS);
				_processSS(importedSS);
			});
		}
		//iterate across rules in the stylesheet
		array.forEach(styleSheet[styleSheet.cssRules?"cssRules":"rules"], function(rule){
			if(rule.type && rule.type === 3){// CSSImportRule (firefox)
				_processSS(rule.styleSheet);
			}
		});
	};
	array.forEach(initialStylesheets,_processSS);
	return ret;
};

return css;

});
