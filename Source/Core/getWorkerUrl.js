define(['./buildModuleUrl', './isCrossOriginUrl'], function(
	buildModuleUrl,
	isCrossOriginUrl
) {
	'use strict';

	function getWorkerUrl(moduleID) {
		var url = buildModuleUrl(moduleID);

		if (isCrossOriginUrl(url)) {
			//to load cross-origin, create a shim worker from a blob URL
			var script = 'importScripts("' + url + '");';

			var blob;
			try {
				blob = new Blob([script], {
					type: 'application/javascript'
				});
			} catch (e) {
				var BlobBuilder =
					window.BlobBuilder ||
					window.WebKitBlobBuilder ||
					window.MozBlobBuilder ||
					window.MSBlobBuilder;
				var blobBuilder = new BlobBuilder();
				blobBuilder.append(script);
				blob = blobBuilder.getBlob('application/javascript');
			}

			var URL = window.URL || window.webkitURL;
			url = URL.createObjectURL(blob);
		}

		return url;
	}

	return getWorkerUrl;
});
