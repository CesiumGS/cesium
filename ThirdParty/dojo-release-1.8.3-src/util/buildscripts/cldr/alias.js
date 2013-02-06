/**
 * There are basically two kinds of alias in CLDR:
 * 1. locale alias e.g.
 *    in xml, <alias source="locale" path="......"/>,
 *    in gernated JSON bunle, xxxx@localeAlias:{'target':'xxx', 'bundle':'xxxx'}
 * 2. other locale alias e.g.
 *    in xml, currently only like <alias source="fr" path="//ldml"/>
 * #1 is supported by this 'alias.js',
 * #2 is covered by 'specialLocale.js' and may need enhancement for future CLDR versions.
 */

djConfig={baseUrl: "../../../dojo/", paths: {"dojo/_base/xhr": "../util/buildscripts/cldr/xhr"}};

load("../../../dojo/dojo.js");
load("../jslib/logger.js");
load("../jslib/fileUtil.js");
load("cldrUtil.js");

dojo.require("dojo.i18n");

var dir/*String*/ = arguments[0];// ${dojo}/dojo/cldr/nls
var logDir = arguments[1];
var logStr = "";

//Add new bundles to the list so that they will be aliased according to the ldml spec.
var BUNDLES = ['gregorian','hebrew','islamic','islamic-civil','buddhist'];

var LOCALE_ALIAS_MARK = '@localeAlias';
var LOCALE_ALIAS_SOURCE_PROPERTY = 'source';
var LOCALE_ALIAS_TARGET_PROPERTY = 'target';
var LOCALE_ALIAS_TARGET_BUNDLE = 'bundle';
var localeAliasPaths = [];/**/
var records = {};/*{property : boolean}, record whether a property has been calculated for alias path*/
var updated = false;

print('alias.js...');

for(var i = 0; i < BUNDLES.length; i++){
	var regExp = new RegExp('\/' + BUNDLES[i] + '\.js$'); //e.g. new RegExp('\/gregorian\.js$')
	var fileList = fileUtil.getFilteredFileList(dir, regExp, true);
	
	for(var j = 0; j < fileList.length; j++){
		var jsFileName = new String(fileList[j]); //Java String
		var jsFilePath = jsFileName.split("/");
		var locale = jsFilePath[jsFilePath.length-2];
		if(locale=="nls"){continue;} // no need for root bundle
		try{
//			dojo.i18n._requireLocalization('dojo.cldr', BUNDLES[i], locale); //declare bundle
			var bundle = dojo.i18n.getLocalization('dojo.cldr', BUNDLES[i], locale); //get bundle
			var nativeSrcBundle = getNativeBundle(jsFileName);//bundle not flattened
		}catch(e){/*logStr += "alias: an exception occurred: "+e;/* simply ignore if no bundle found*/}
		
		if(!bundle) continue;
		
		updated = false;
		//logStr += locale + ":" + BUNDLES[i] + "=========================================================================\n";
		
		_calculateAliasPath(bundle, BUNDLES[i]);
		//logStr += "all alias paths=" + dojo.toJson(localeAliasPaths) + "\n";
				
		_processLocaleAlias(localeAliasPaths, bundle, nativeSrcBundle,locale);
		
		if(updated){
			fileUtil.saveUtf8File(jsFileName, "(" + dojo.toJson(nativeSrcBundle, true) + ")");
		}
		//logStr += '\n';
	}
	cleanLocaleAlias(fileList);
}

//fileUtil.saveUtf8File(logDir + '/alias.log',logStr+'\n');
//print('CLDR finished, please refer to logs at ' + logDir + ' for more details.');


function _calculateAliasPath(bundle, name/*String*/){
	for(p in bundle){
		var index = p.indexOf(LOCALE_ALIAS_MARK);
		if(index >= 0 /*p like 'xxx@localeAlias6'*/){
			var localeAliasSource/*String*/ = p.substring(0,index);
			if(records[localeAliasSource]/*calculated*/){
				//logStr += p + " has been calculated, ignored\n"
				continue;
			}
			
			var path = [];
			var aliasIndex = new Number(p.substring(index + LOCALE_ALIAS_MARK.length));
			//logStr += "aliasIndex for " + p + " is " + aliasIndex + "\n";
			var i = aliasIndex;
			while(bundle[localeAliasSource + LOCALE_ALIAS_MARK + (--i)]){}
			
			var src = localeAliasSource;
			while(bundle[localeAliasSource + LOCALE_ALIAS_MARK + (++i)]){
				var mapping = {};
				mapping[LOCALE_ALIAS_SOURCE_PROPERTY] = src;
				mapping[LOCALE_ALIAS_TARGET_PROPERTY] = bundle[localeAliasSource + LOCALE_ALIAS_MARK + i][LOCALE_ALIAS_TARGET_PROPERTY];
				mapping[LOCALE_ALIAS_TARGET_BUNDLE] = bundle[localeAliasSource + LOCALE_ALIAS_MARK + i][LOCALE_ALIAS_TARGET_BUNDLE];
				//whether aliased to the bundle itself
				mapping.inSelf = mapping[LOCALE_ALIAS_TARGET_BUNDLE] === name;
				path.push(mapping);
				records[src] = true;
				src = bundle[localeAliasSource + LOCALE_ALIAS_MARK + i][LOCALE_ALIAS_TARGET_PROPERTY];
			}
			path = path.reverse();
			//logStr += "alias path calucated for " + localeAliasSource + "=" + dojo.toJson(path) + "\n";
			localeAliasPaths.push(path);
		}
	}
}

function _processLocaleAlias(localeAliasPaths/*Array*/, bundle/*JSON Obj*/, nativeSrcBundle/*JSON Obj*/,locale/*String*/){
	// summary:
	//		Update all properties as defined by 'locale' alias mapping
	//		E.g.'months-format-abbr@localeAlias6':{'target':"months-format-wide", 'bundle':"gregorian"},
	//		means the array values of 'months-format-abbr' in current bundle should be
	//		merged with(inherit or overwrite) that of 'months-format-wide' in 'gregorian' bundle
	//
	//		Note:	   Currently no bundle recognition, always assume 'gregorian'.

	var processed = {};
	for(var i = 0; i < localeAliasPaths.length; i++){
		var path = localeAliasPaths[i];
		for(var j = 0; j < path.length; j++){
			var mapping = path[j];
			if(mapping.inSelf && mapping[LOCALE_ALIAS_SOURCE_PROPERTY] != mapping[LOCALE_ALIAS_TARGET_PROPERTY]
			   && bundle[mapping[LOCALE_ALIAS_TARGET_PROPERTY]]/*target existed*/){
				//e.g. {'source':'months-format-abbr','target':"months-format-wide",'bundle':"gregorian"},
				//currently source and target bundles are the same - gregorian
				if(processed[mapping[LOCALE_ALIAS_SOURCE_PROPERTY]]){/*haven't been processed*/
					//logStr += "!" + mapping[LOCALE_ALIAS_SOURCE_PROPERTY] +" has been processed for alias, escaped\n";
					continue;
				}
				_updateLocaleAlias(bundle, mapping[LOCALE_ALIAS_SOURCE_PROPERTY], bundle,
								   mapping[LOCALE_ALIAS_TARGET_PROPERTY], nativeSrcBundle);
				processed[mapping[LOCALE_ALIAS_SOURCE_PROPERTY]] =  true;
			}else if(!mapping.inSelf){
				//For other non-gregorian calendars. e.g. "hebrew" etc.
				//Get the bundle according to the locale.
				var targetBundle = dojo.i18n.getLocalization('dojo.cldr', mapping[LOCALE_ALIAS_TARGET_BUNDLE], locale);
				if(processed[mapping[LOCALE_ALIAS_SOURCE_PROPERTY]]){//If being processed, continue;
					continue;
				}
				_updateNoneGregAlias(bundle, mapping[LOCALE_ALIAS_SOURCE_PROPERTY], targetBundle,
								   mapping[LOCALE_ALIAS_TARGET_PROPERTY], nativeSrcBundle);
				processed[mapping[LOCALE_ALIAS_SOURCE_PROPERTY]] =  true;
			}
		}
	}
}
/*
* This function will flatten the source bundle for non-gregorian ones by searching in the bundle files generated from the ldml spec which have terms like:
* "'months-standAlone-abbr@localeAlias131':{'target':"months-format-abbr",'bundle':"hebrew"},".
*   Parameters:
*   	sourceBundle: The bundles which need to be aliased.
*   	aliasSource:  The source mark string. 'months-standAlone-abbr' for example.
*   	targetBundle: The aliased bundle. 'hebrew' for example.
*   	aliasTarget:  The target mark string. 'months-format-abbr' for example.
*   	nativeSrcBundle: The final flattened bundle file.
* According to the dojo way of fetching resource bundle, this function will firstly check the bundle under the appointed
* locale. If the wanted calendar bundle is not under the locale, the root calendar bundle will be fetched. If the non-gregorian
* bundle in the root can not be found, dojo will finally get the root gregorian bundle.
*/
function _updateNoneGregAlias(sourceBundle/*JSON Obj*/, aliasSource/*String*/, targetBundle/*JSON Obj*/, aliasTarget/*String*/, nativeSrcBundle/*JSON Obj*/){
    for (var sKey in sourceBundle) {
        var target = targetBundle[sKey],
	    source = sourceBundle[sKey],
	    nativeSrc = nativeSrcBundle[sKey];

	if (sKey.indexOf(aliasSource) == 0 && !nativeSrc && target && !compare(source, target)) {
            nativeSrcBundle[sKey] = target;
            sourceBundle[sKey] = target;
            updated = true;
        } else {
            if (sKey.indexOf(aliasSource) == 0 && nativeSrc && dojo.isArray(source) && dojo.isArray(target)) {
                for (var i = 0; i < source.length; i++) {
                    if (source[i] === undefined) {
                        source[i] = target[i];
                        updated = true;
                    }
                }
                if (source.length < target.length) {
                    source = sourceBundle[sKey] = source.concat(target.slice(source.length));
                    updated = true;
                }
                if (updated) {
                    nativeSrcBundle[sKey] = source;
                }
            }
        }
    }
}
function _updateLocaleAlias(sourceBundle/*JSON Obj*/,aliasSource/*String*/, targetBundle/*JSON Obj*/,
							aliasTarget/*String*/, nativeSrcBundle/*JSON Obj*/){
		//single property
		if(!nativeSrcBundle[aliasSource] && nativeSrcBundle[aliasTarget]//no this property in current locale
		   && !compare(sourceBundle[aliasSource], targetBundle[aliasTarget])){
			// then should inherit from alias target (as defined by 'locale' alias)
			//logStr += '1 '+aliasSource + "=" + sourceBundle[aliasSource] + " is replaced with " + aliasTarget + "=" + targetBundle[aliasTarget]+'\n';
			//sourceBundle[aliasSource] =  targetBundle[aliasTarget];
			nativeSrcBundle[aliasSource] =  targetBundle[aliasTarget];
			sourceBundle[aliasSource] = nativeSrcBundle[aliasSource];
			updated = true;
		}else if(nativeSrcBundle[aliasSource] && dojo.isArray(sourceBundle[aliasSource])
		         && dojo.isArray(targetBundle[aliasTarget])){
			if(sourceBundle[aliasSource].length > targetBundle[aliasTarget].length){
				//logStr +="Error:" + aliasSource + ".length > " +  aliasTarget + ".length \n";
			}
			//array property, see if need inherit
			for(var i = 0; i < sourceBundle[aliasSource].length; i++){
				if(sourceBundle[aliasSource][i] == undefined){//need inherit
					//logStr += '2 ' + aliasSource + "["+i+"]=" +sourceBundle[aliasSource][i]+" is replaced with " + aliasTarget+"["+i+"]="+targetBundle[aliasTarget][i]+'\n';
					sourceBundle[aliasSource][i] =  targetBundle[aliasTarget][i];
					updated = true;
				}// otherwise no change and use current value
			}
			if(sourceBundle[aliasSource].length < targetBundle[aliasTarget].length){
				//logStr +='3 ' + aliasSource +' from ' + sourceBundle[aliasSource].length +' to '
				//		  + (targetBundle[aliasTarget].length-1) + ' are copied from '
				//		  +aliasTarget + '='+ targetBundle[aliasTarget] +'\n';
				sourceBundle[aliasSource] = sourceBundle[aliasSource].concat(
											targetBundle[aliasTarget].slice(sourceBundle[aliasSource].length));
				updated = true;
			}
			if(updated){
				nativeSrcBundle[aliasSource] = sourceBundle[aliasSource];
			}
		}
}

function cleanLocaleAlias(fileList/*Array*/){
	for(var i = 0; i < fileList.length; i++){
		var fileName = new String(fileList[i]); //Java String
		try{
			var bundle = getNativeBundle(fileName);//bundle not flattened
		}catch(e){print(e);/* simply ignore if no bundle found*/}
		
		var newBundle = {};
		var needUpdate = false;
		for(p in bundle){
			if(p.indexOf(LOCALE_ALIAS_MARK) < 0){
				newBundle[p] = bundle[p];
			}else{
				needUpdate = true;
			}
		}
		if(needUpdate){
			fileUtil.saveUtf8File(fileName, "(" + dojo.toJson(newBundle, true) + ")");
			//logStr += "cleaned @localAlias for " + fileName + "\n";
		}
	}
}
