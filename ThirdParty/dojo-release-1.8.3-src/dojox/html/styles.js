define(["dojo/_base/lang", "dojo/_base/array", "dojo/_base/window", "dojo/_base/sniff"], 
	function(lang, ArrayUtil, Window, has) {
	// summary:
	//		Methods for creating and manipulating dynamic CSS Styles and Style Sheets
	// example:
	//	|		dojox.html.createStyle("#myDiv input", "font-size:24px");
	//		Creates Style #myDiv input, which can now be applied to myDiv, and
	//		the inner input will be targeted
	//	|		dojox.html.createStyle(".myStyle", "color:#FF0000");
	//		Now the class myStyle can be assigned to a node's className

	var dh = lang.getObject("dojox.html", true);
	var dynamicStyleMap = {};
	var pageStyleSheets = {};
	var titledSheets = [];

	dh.insertCssRule = function(/*String*/selector, /*String*/declaration, /*String?*/styleSheetName){
		// summary:
		//		Creates a style and attaches it to a dynamically created stylesheet
		// selector:
		//		A fully qualified class name, as it would appear in
		//		a CSS dojo.doc. Start classes with periods, target
		//		nodes with '#'. Large selectors can also be created
		//		like:
		// |	 "#myDiv.myClass span input"
		// declaration:
		//		A single string that would make up a style block, not
		//		including the curly braces. Include semi-colons between
		//		statements. Do not use JavaScript style declarations
		//		in camel case, use as you would in a CSS dojo.doc:
		//		| "color:#ffoooo;font-size:12px;margin-left:5px;"
		// styleSheetName:
		//		Name of the dynamic style sheet this rule should be
		//		inserted into. If is not found by that name, it is
		//		created. If no name is passed, the name "default" is
		//		used.

		var ss = dh.getDynamicStyleSheet(styleSheetName);
		var styleText = selector + " {" + declaration + "}";
		console.log("insertRule:", styleText);
		if(has("ie")){
			// Note: check for if(ss.cssText) does not work
			ss.cssText+=styleText;
			console.log("ss.cssText:", ss.cssText);
		}else if(ss.sheet){
			ss.sheet.insertRule(styleText, ss._indicies.length);
		}else{
			ss.appendChild(Window.doc.createTextNode(styleText));
		}
		ss._indicies.push(selector+" "+declaration);
		return selector; // String
	};

	dh.removeCssRule = function(/*String*/selector, /*String*/declaration, /*String*/styleSheetName){
		// summary:
		//		Removes a cssRule base on the selector and declaration passed
		//		The declaration is needed for cases of dupe selectors
		// description: Only removes DYNAMICALLY created cssRules. If you
		//		created it with dh.insertCssRule, it can be removed.

		var ss;
		var index=-1;
		var nm;
		var i;
		for(nm in dynamicStyleMap){
			if(styleSheetName && styleSheetName !== nm) {continue;}
			ss = dynamicStyleMap[nm];
			for(i=0;i<ss._indicies.length;i++){
				if(selector+" "+declaration === ss._indicies[i]){
					index = i;
					break;
				}
			}
			if(index>-1) { break; }
		}
		if(!ss){
			console.warn("No dynamic style sheet has been created from which to remove a rule.");
			return false;
		}
		if(index===-1){
			console.warn("The css rule was not found and could not be removed.");
			return false;
		}
		ss._indicies.splice(index, 1);
		if(has("ie")){
			// Note: check for if(ss.removeRule) does not work
			ss.removeRule(index);
		}else if(ss.sheet){
			ss.sheet.deleteRule(index);
		}
		return true; //Boolean
	};

	dh.modifyCssRule = function(selector, declaration, styleSheetName){
		// summary:
		//		Not implemented - it seems to have some merit for changing some complex
		//		selectors. It's not much use for changing simple ones like "span".
		//		For now, simply write a new rule which will cascade over the first.
		//
		//		Modifies an existing cssRule
	};

	dh.getStyleSheet = function(/*String?*/styleSheetName){
		// summary:
		//		Returns a style sheet based on the argument.
		//		Searches dynamic style sheets first. If no matches,
		//		searches document style sheets.
		// styleSheetName:
		//		A title or an href to a style sheet. Title can be
		//		an attribute in a tag, or a dynamic style sheet
		//		reference. Href can be the name of the file.
		//		If no argument, the assumed created dynamic style
		//		sheet is used.

		// try dynamic sheets first
		if(dynamicStyleMap[styleSheetName || "default"]){
			return dynamicStyleMap[styleSheetName || "default"];
		}
		if(!styleSheetName){
			// no arg is nly good for the default style sheet
			// and it has not been created yet.
			return false;
		}
		var allSheets = dh.getStyleSheets();
		// now try document style sheets by name
		if(allSheets[styleSheetName]){
			return dh.getStyleSheets()[styleSheetName];
		}
		// check for partial matches in hrefs (so that a fully
		//qualified name does not have to be passed)
		var nm;
		for ( nm in allSheets){
			if( allSheets[nm].href && allSheets[nm].href.indexOf(styleSheetName)>-1){
				return allSheets[nm];
			}
		}
		return false; //StyleSheet or false
	};

	dh.getDynamicStyleSheet = function(/*String?*/styleSheetName){
		// summary:
		//		Creates and returns a dynamically created style sheet
		//		used for dynamic styles
		// styleSheetName:
		//		The name given the style sheet so that multiple
		//		style sheets can be created and referenced. If
		//		no argument is given, the name "default" is used.

		if(!styleSheetName){ styleSheetName="default"; }
		if(!dynamicStyleMap[styleSheetName]){
			if(Window.doc.createStyleSheet){ //IE
				dynamicStyleMap[styleSheetName] = Window.doc.createStyleSheet();
				if(has("ie") < 9) {
					// IE9 calls this read-only. Loving the new browser so far.
					dynamicStyleMap[styleSheetName].title = styleSheetName;
				}
			}else{
				dynamicStyleMap[styleSheetName] = Window.doc.createElement("style");
				dynamicStyleMap[styleSheetName].setAttribute("type", "text/css");
				Window.doc.getElementsByTagName("head")[0].appendChild(dynamicStyleMap[styleSheetName]);
				console.log(styleSheetName, " ss created: ", dynamicStyleMap[styleSheetName].sheet);
			}
			dynamicStyleMap[styleSheetName]._indicies = [];
		}
		return dynamicStyleMap[styleSheetName]; //StyleSheet
	};

	dh.enableStyleSheet = function(/*String*/styleSheetName){
		// summary:
		//		Enables the style sheet with the name passed in the
		//		argument. Deafults to the default style sheet.
		//
		var ss = dh.getStyleSheet(styleSheetName);
		if(ss){
			if(ss.sheet){
				ss.sheet.disabled = false;
			}else{
				ss.disabled = false;
			}
		}
	};

	dh.disableStyleSheet = function(/* String */styleSheetName){
		// summary:
		//		Disables the dynamic style sheet with the name passed in the
		//		argument. If no arg is passed, defaults to the default style sheet.

		var ss = dh.getStyleSheet(styleSheetName);
		if(ss){
			if(ss.sheet){
				ss.sheet.disabled = true;
			}else{
				ss.disabled = true;
			}
		}
	};

	dh.activeStyleSheet = function(/*String?*/title){
		// summary:
		//		Getter/Setter
		// description:
		//		If passed a title, enables a that style sheet. All other
		//		toggle-able style sheets are disabled.
		//		If no argument is passed, returns currently enabled
		//		style sheet.

		var sheets = dh.getToggledStyleSheets();
		var i;
		if(arguments.length === 1){
			//console.log("sheets:", sheets);
			ArrayUtil.forEach(sheets, function(s){
				s.disabled = (s.title === title) ? false : true;
			});
		}else{
			for(i=0;i<sheets.length;i++){
				if(sheets[i].disabled === false){
					return sheets[i];
				}
			}
		}
		return true; //StyleSheet or Boolean - FIXME - doesn't make a lot of sense
	};

	dh.getPreferredStyleSheet = function(){
		// summary:
		//		Returns the style sheet that was initially enabled
		//		on document launch.
		//		TODO, does not work.
	};

	//	TODO: Sets of style sheets could be grouped according to
	//			an ID and used in sets, much like different
	//			groups of radio buttons. It would not however be
	//			according to W3C spec
	//
	dh.getToggledStyleSheets = function(){
		// summary:
		//		Searches HTML for style sheets that are "toggle-able" -
		//		can be enabled and disabled. These would include sheets
		//		with the title attribute, as well as the REL attribute.
		// returns:
		//		An array of all toggle-able style sheets
		var nm;
		if(!titledSheets.length){
			var sObjects = dh.getStyleSheets();
			for(nm in sObjects){
				if(sObjects[nm].title){
					titledSheets.push(sObjects[nm]);
				}
			}
		}
		return titledSheets; //Array
	};

	//TODO: Does not recursively search for @imports, so it will
	//		only go one level deep.
	dh.getStyleSheets = function(){
		// summary:
		//		Collects all the style sheets referenced in the HTML page,
		//		including any included via @import.
		// returns:
		//		An hash map of all the style sheets.
		if(pageStyleSheets.collected) {return pageStyleSheets;}
		var sheets = Window.doc.styleSheets;
		ArrayUtil.forEach(sheets, function(n){
			var s = (n.sheet) ? n.sheet : n;
			var name = s.title || s.href;
			if(has("ie")){
				// IE attaches a style sheet for VML - do not include this
				if(s.cssText.indexOf("#default#VML") === -1){
					if(s.href){
						// linked
						pageStyleSheets[name] = s;
					}else if(s.imports.length){
						// Imported via @import
						ArrayUtil.forEach(s.imports, function(si){
							pageStyleSheets[si.title || si.href] = si;
						});
					}else{
						//embedded within page
						pageStyleSheets[name] = s;
					}
				}
			}else{
				//linked or embedded
				pageStyleSheets[name] = s;
				pageStyleSheets[name].id = s.ownerNode.id;
				ArrayUtil.forEach(s.cssRules, function(r){
					if(r.href){
						// imported
						pageStyleSheets[r.href] = r.styleSheet;
						pageStyleSheets[r.href].id = s.ownerNode.id;
					}
				});
			}
		});
		//console.log("pageStyleSheets:", pageStyleSheets);
		pageStyleSheets.collected = true;
		return pageStyleSheets; //Object
	};
	
	return dh;
});
