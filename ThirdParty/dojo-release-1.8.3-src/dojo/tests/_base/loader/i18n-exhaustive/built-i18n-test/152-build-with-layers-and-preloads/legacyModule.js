/*
	Copyright (c) 2004-2010, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

/*
	This is an optimized version of Dojo, built for deployment and not for
	development. To get sources and documentation, please visit:

		http://dojotoolkit.org
*/

if(!dojo._hasResource["i18nTest.legacyModule"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["i18nTest.legacyModule"] = true;
dojo.provide("i18nTest.legacyModule");



window.i18nTest.legacyModule = function(){
	var legacyBundle = dojo.i18n.getLocalization("i18nTest", "legacyBundle"),
		result = [];

	if(legacyBundle.rootValueOnly!="rootValueOnly"){
		result.push('legacyBundle.rootValueOnly!="rootValueOnly"');
	}
	switch(dojo.locale){
		case "ab":
		case "ab-cd":
			if(legacyBundle.legacyBundle!="legacyBundle-ab"){
				result.push('legacyBundle.legacyBundle!="legacyBundle-ab"');
			}
			if(legacyBundle.abValueOnly!="abValueOnly"){
				result.push('legacyBundle.abValueOnly!="abValueOnly"');
			}
			break;
		case "ab-cd-ef":
			if(legacyBundle.legacyBundle!="legacyBundle-ab-cd-ef"){
				result.push('legacyBundle.legacyBundle!="legacyBundle-ab-cd-ef"');
			}
			if(legacyBundle.abValueOnly!="abValueOnly"){
				result.push('legacyBundle.abValueOnly!="abValueOnly"');
			}
			if(legacyBundle.abCdEfValueOnly!="abCdEfValueOnly"){
				result.push('legacyBundle.abCdEfValueOnly!="abCdEfValueOnly"');
			}
			break;
		default:
			if(legacyBundle.legacyBundle!="legacyBundle"){
				result.push('legacyBundle.legacyBundle!="legacyBundle"');
			}
	}

	return result.length==0 ? true : result.join(";");
};

}


dojo.i18n._preloadLocalizations("i18nTest.nls.legacyModule", ["ROOT","ab","ab-cd","ab-cd-ef","xx"]);
