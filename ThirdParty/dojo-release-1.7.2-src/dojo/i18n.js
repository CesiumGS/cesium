define(["./_base/kernel", "require", "./has", "./_base/array", "./_base/config", "./_base/lang", "./_base/xhr"],
	function(dojo, require, has, array, config, lang, xhr) {
	// module:
	//		dojo/i18n
	// summary:
	//		This module implements the !dojo/i18n plugin and the v1.6- i18n API
	// description:
	//		We choose to include our own plugin to leverage functionality already contained in dojo
	//		and thereby reduce the size of the plugin compared to various loader implementations. Also, this
	//		allows foreign AMD loaders to be used without their plugins.
	var
		thisModule= dojo.i18n=
			// the dojo.i18n module
			{},

		nlsRe=
			// regexp for reconstructing the master bundle name from parts of the regexp match
			// nlsRe.exec("foo/bar/baz/nls/en-ca/foo") gives:
			// ["foo/bar/baz/nls/en-ca/foo", "foo/bar/baz/nls/", "/", "/", "en-ca", "foo"]
			// nlsRe.exec("foo/bar/baz/nls/foo") gives:
			// ["foo/bar/baz/nls/foo", "foo/bar/baz/nls/", "/", "/", "foo", ""]
			// so, if match[5] is blank, it means this is the top bundle definition.
			// courtesy of http://requirejs.org
			/(^.*(^|\/)nls)(\/|$)([^\/]*)\/?([^\/]*)/,

		getAvailableLocales= function(
			root,
			locale,
			bundlePath,
			bundleName
		){
			// return a vector of module ids containing all available locales with respect to the target locale
			// For example, assuming:
			//	 * the root bundle indicates specific bundles for "fr" and "fr-ca",
			//	 * bundlePath is "myPackage/nls"
			//	 * bundleName is "myBundle"
			// Then a locale argument of "fr-ca" would return
			//	 ["myPackage/nls/myBundle", "myPackage/nls/fr/myBundle", "myPackage/nls/fr-ca/myBundle"]
			// Notice that bundles are returned least-specific to most-specific, starting with the root.
			//
			// If root===false indicates we're working with a pre-AMD i18n bundle that doesn't tell about the available locales;
			// therefore, assume everything is available and get 404 errors that indicate a particular localization is not available
			//

			for(var result= [bundlePath + bundleName], localeParts= locale.split("-"), current= "", i= 0; i<localeParts.length; i++){
				current+= (current ? "-" : "") + localeParts[i];
				if(!root || root[current]){
					result.push(bundlePath + current + "/" + bundleName);
				}
			}
			return result;
		},

		cache= {},

		getL10nName= dojo.getL10nName = function(moduleName, bundleName, locale){
			locale = locale ? locale.toLowerCase() : dojo.locale;
			moduleName = "dojo/i18n!" + moduleName.replace(/\./g, "/");
			bundleName = bundleName.replace(/\./g, "/");
			return (/root/i.test(locale)) ?
				(moduleName + "/nls/" + bundleName) :
				(moduleName + "/nls/" + locale + "/" + bundleName);
		},

		doLoad = function(require, bundlePathAndName, bundlePath, bundleName, locale, load){
			// get the root bundle which instructs which other bundles are required to construct the localized bundle
			require([bundlePathAndName], function(root){
				var
					current= cache[bundlePathAndName + "/"]= lang.clone(root.root),
					availableLocales= getAvailableLocales(!root._v1x && root, locale, bundlePath, bundleName);
				require(availableLocales, function(){
					for (var i= 1; i<availableLocales.length; i++){
						cache[availableLocales[i]]= current= lang.mixin(lang.clone(current), arguments[i]);
					}
					// target may not have been resolve (e.g., maybe only "fr" exists when "fr-ca" was requested)
					var target= bundlePathAndName + "/" + locale;
					cache[target]= current;
					load && load(lang.delegate(current));
				});
			});
		},

		normalize = function(id, toAbsMid){
			// note: id may be relative
			var match= nlsRe.exec(id),
				bundlePath= match[1];
			return /^\./.test(bundlePath) ? toAbsMid(bundlePath) + "/" +  id.substring(bundlePath.length) : id;
		},

		checkForLegacyModules = function(){},

		load = function(id, require, load){
			// note: id is always absolute
			var
				match= nlsRe.exec(id),
				bundlePath= match[1] + "/",
				bundleName= match[5] || match[4],
				bundlePathAndName= bundlePath + bundleName,
				localeSpecified = (match[5] && match[4]),
				targetLocale=  localeSpecified || dojo.locale,
				target= bundlePathAndName + "/" + targetLocale;

			if(localeSpecified){
				checkForLegacyModules(target);
				if(cache[target]){
					// a request for a specific local that has already been loaded; just return it
					load(cache[target]);
				}else{
					// a request for a specific local that has not been loaded; load and return just that locale
					doLoad(require, bundlePathAndName, bundlePath, bundleName, targetLocale, load);
				}
				return;
			}// else a non-locale-specific request; therefore always load dojo.locale + config.extraLocale

			// notice the subtle algorithm that loads targetLocal last, which is the only doLoad application that passes a value for the load callback
			// this makes the sync loader follow a clean code path that loads extras first and then proceeds with tracing the current deps graph
			var extra = config.extraLocale || [];
			extra = lang.isArray(extra) ? extra : [extra];
			extra.push(targetLocale);
			var remaining = extra.length,
				targetBundle;
			array.forEach(extra, function(locale){
				doLoad(require, bundlePathAndName, bundlePath, bundleName, locale, function(bundle){
					if(locale == targetLocale){
						targetBundle = bundle;
					}
					if(!--remaining){
						load(targetBundle);
					}
				});
			});
		};

	if(has("dojo-unit-tests")){
		var unitTests = thisModule.unitTests = [];
	}

	has.add("dojo-v1x-i18n-Api",
		// if true, define the v1.x i18n functions
		1
	);

	if(has("dojo-v1x-i18n-Api")){
		var
			__evalError = {},

			evalBundle=
				// use the function ctor to keep the minifiers away and come close to global scope
				// if bundle is an AMD bundle, then __amdResult will be defined; otherwise it's a pre-amd bundle and the bundle value is returned by eval
				new Function("bundle, __evalError",
					"var __amdResult, define = function(x){__amdResult= x;};" +
					"return [(function(){" +
								"try{eval(arguments[0]);}catch(e){}" +
								"if(__amdResult)return 0;" +
								"try{return eval('('+arguments[0]+')');}" +
								"catch(e){__evalError.e = e; return __evalError;}" +
							"})(arguments[0]) , __amdResult];"
				),

			fixup= function(url, preAmdResult, amdResult){
				// nls/<locale>/<bundle-name> indicates not the root.
				if(preAmdResult===__evalError){
					console.error("failed to evaluate i18n bundle; url=" + url, __evalError.e);
					return {};
				}
				return preAmdResult ? (/nls\/[^\/]+\/[^\/]+$/.test(url) ? preAmdResult : {root:preAmdResult, _v1x:1}) : amdResult;
			},

			syncRequire= function(deps, callback){
				var results= [];
				array.forEach(deps, function(mid){
					var url= require.toUrl(mid + ".js");
					if(cache[url]){
						results.push(cache[url]);
					}else{

						try {
							var bundle= require(mid);
							if(bundle){
								results.push(bundle);
								return;
							}
						}catch(e){}

						xhr.get({
							url:url,
							sync:true,
							load:function(text){
								var result = evalBundle(text, __evalError);
								results.push(cache[url]= fixup(url, result[0], result[1]));
							},
							error:function(){
								results.push(cache[url]= {});
							}
						});
					}
				});
				callback && callback.apply(null, results);
			},

			normalizeLocale = thisModule.normalizeLocale= function(locale){
				var result = locale ? locale.toLowerCase() : dojo.locale;
				if(result == "root"){
					result = "ROOT";
				}
				return result;
			},

			forEachLocale = function(locale, func){
				// this function is equivalent to v1.6 dojo.i18n._searchLocalePath with down===true
				var parts = locale.split("-");
				while(parts.length){
					if(func(parts.join("-"))){
						return true;
					}
					parts.pop();
				}
				return func("ROOT");
			};

		checkForLegacyModules = function(target){
			// legacy code may have already loaded [e.g] the raw bundle x/y/z at x.y.z; when true, push into the cache
			for(var names = target.split("/"), object = dojo.global[names[0]], i = 1; object && i<names.length; object = object[names[i++]]){}
			if(object){
				cache[target] = object;
			}
		};

		thisModule.getLocalization= function(moduleName, bundleName, locale){
			var result,
				l10nName= getL10nName(moduleName, bundleName, locale).substring(10);
			load(l10nName, (has("dojo-sync-loader") && !require.isXdUrl(require.toUrl(l10nName + ".js")) ? syncRequire : require), function(result_){ result= result_; });
			return result;
		};

		thisModule._preloadLocalizations = function(/*String*/bundlePrefix, /*Array*/localesGenerated){
			//	summary:
			//		Load built, flattened resource bundles, if available for all
			//		locales used in the page. Only called by built layer files.
			//
			//  note: this function a direct copy of v1.6 function of same name

			function preload(locale){
				locale = normalizeLocale(locale);
				forEachLocale(locale, function(loc){
					for(var i=0; i<localesGenerated.length;i++){
						if(localesGenerated[i] == loc){
							syncRequire([bundlePrefix.replace(/\./g, "/")+"_"+loc]);
							return true; // Boolean
						}
					}
					return false; // Boolean
				});
			}
			preload();
			var extra = dojo.config.extraLocale||[];
			for(var i=0; i<extra.length; i++){
				preload(extra[i]);
			}
		};

		if(has("dojo-unit-tests")){
			unitTests.push(function(doh){
				doh.register("tests.i18n.unit", function(t){
					var check;

					check = evalBundle("{prop:1}", __evalError);
					t.is({prop:1}, check[0]); t.is(undefined, check[1]);

					check = evalBundle("({prop:1})", __evalError);
					t.is({prop:1}, check[0]); t.is(undefined, check[1]);

					check = evalBundle("{'prop-x':1}", __evalError);
					t.is({'prop-x':1}, check[0]); t.is(undefined, check[1]);

					check = evalBundle("({'prop-x':1})", __evalError);
					t.is({'prop-x':1}, check[0]); t.is(undefined, check[1]);

					check = evalBundle("define({'prop-x':1})", __evalError);
					t.is(0, check[0]); t.is({'prop-x':1}, check[1]);

					check = evalBundle("define({'prop-x':1});", __evalError);
					t.is(0, check[0]); t.is({'prop-x':1}, check[1]);

					check = evalBundle("this is total nonsense and should throw an error", __evalError);
					t.is(__evalError, check[0]); t.is(undefined, check[1]);
					t.is({}, fixup("some/url", check[0], check[1]));
				});
			});
		}
	}

	return lang.mixin(thisModule, {
		dynamic:true,
		normalize:normalize,
		load:load,
		cache:function(mid, value){
			cache[mid] = value;
		}
	});
});
