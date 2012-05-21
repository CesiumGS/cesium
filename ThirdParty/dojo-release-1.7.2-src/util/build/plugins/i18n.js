///
// \module build/plugins/i18n
//
define(["../buildControl"], function(bc) {
	var
		nlsRe=
			// regexp for reconstructing the master bundle name from parts of the regexp match
			// nlsRe.exec("foo/bar/baz/nls/en-ca/foo") gives:
			// ["foo/bar/baz/nls/en-ca/foo", "foo/bar/baz/nls/", "/", "/", "en-ca", "foo"]
			// nlsRe.exec("foo/bar/baz/nls/foo") gives:
			// ["foo/bar/baz/nls/foo", "foo/bar/baz/nls/", "/", "/", "foo", ""]
			// so, if match[5] is blank, it means this is the top bundle definition.
			// courtesy of http://requirejs.org
			/(^.*(^|\/)nls(\/|$))([^\/]*)\/?([^\/]*)/,

		getAvailableLocales= function(
			root,
			locale,
			bundlePath,
			bundleName,
			availableLocales
		) {
			for (var localeParts= locale.split("-"), current= "", i= 0; i<localeParts.length; i++) {
				current+= localeParts[i];
				if (root[current]) {
					availableLocales[bundlePath + current + "/" + bundleName]= 1;
				}
			}
		},

		start= function(
			mid,
			referenceModule,
			bc
		) {
			var
				i18nPlugin= bc.amdResources["dojo/i18n"],
				match= nlsRe.exec(mid),
				bundleName= match[5] || match[4],
				bundlePath= bc.getSrcModuleInfo(match[1] + bundleName, referenceModule).mid.match(/(.+\/)[^\/]+/)[1],
				locale= (match[5] && match[4]),
				i18nResourceMid= bundlePath + (locale ? locale + "/" : "") + bundleName,
				i18nResource= bc.amdResources[i18nResourceMid];

			if (!i18nPlugin) {
				throw new Error("i18n! plugin missing");
			}
			if (!i18nResource) {
				throw new Error("i18n resource (" + i18nResourceMid + ") missing");
			}
	return [i18nPlugin, i18nResource];

			var result = [i18nPlugin, i18nResource];
			(bc.extraLocales||[]).forEach(function(locale){
				i18nResourceMid= bundlePath + locale + "/" + bundleName,
				i18nResource= bc.amdResources[i18nResourceMid];
				if(i18nResource){
					result.push(i18nResource);
				}
			});
			return result;
		};

	return {
		start:start
	};
});
