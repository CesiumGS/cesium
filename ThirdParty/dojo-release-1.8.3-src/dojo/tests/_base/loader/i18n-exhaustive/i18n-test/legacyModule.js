dojo.provide("i18nTest.legacyModule");
dojo.requireLocalization("i18nTest", "amdBundle");
dojo.requireLocalization("i18nTest", "legacyBundle");

i18nTest.legacyModule = function(){
	var legacyBundle = dojo.i18n.getLocalization("i18nTest", "legacyBundle"),
		amdBundle = dojo.i18n.getLocalization("i18nTest", "amdBundle"),
		result = [];

	if(amdBundle.rootValueOnly!="rootValueOnly"){
		result.push('amdBundle.rootValueOnly!="rootValueOnly"');
	}
	switch(dojo.locale){
		case "ab":
		case "ab-cd":
			if(amdBundle.amdBundle!="amdBundle-ab"){
				result.push('amdBundle.amdBundle!="amdBundle-ab"');
			}
			if(amdBundle.abValueOnly!="abValueOnly"){
				result.push('amdBundle.abValueOnly!="abValueOnly"');
			}
			break;
		case "ab-cd-ef":
			if(amdBundle.amdBundle!="amdBundle-ab-cd-ef"){
				result.push('amdBundle.amdBundle!="amdBundle-ab-cd-ef"');
			}
			if(amdBundle.abValueOnly!="abValueOnly"){
				result.push('amdBundle.abValueOnly!="abValueOnly"');
			}
			if(amdBundle.abCdEfValueOnly!="abCdEfValueOnly"){
				result.push('amdBundle.abCdEfValueOnly!="abCdEfValueOnly"');
			}
			break;
		default:
			if(amdBundle.amdBundle!="amdBundle"){
				result.push('amdBundle.amdBundle!="amdBundle"');
			}
	}


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

	var i18n= require("dojo/i18n");
	for(var p in i18n._cache) console.log(p);

	return result.length==0 ? true : result.join(";");
};
