define([
	"../buildControl",
	"../fileUtils",
 	"dojo/_base/lang"
], function(bc, fileUtils, lang) {
	// note: this transform originated from the v1.6 build system. In 1.8 it has been enhanced to handle
	// relative paths for imports when the src and destination tree structures are not predictable.
	//
	// The cssImportIgnore logic remains although it is of questionable value because it depends on naming a file
	// exactly as it is named in an import directive. Instead, the tag "importIgnore" can be used to prevent expanding
	// a CSS file and the tag "noOptimize" can be used to prevent optimizing a CSS file. The tag system gives a
	// much more general method to handle this problem. Of course cssImportIgnore can be disabled by simply setting
	// it to falsy.

	var cssImportRegExp = /\@import\s+(url\()?\s*([^);]+)\s*(\))?([\w, ]*)(;)?/g,
		cssUrlRegExp = /\url\(\s*([^\)]+)\s*\)?/g,

		checkSlashes = function(name){
			return name.replace(/\\/g, "/");
		},

		cssImportIgnore = (bc.cssImportIgnore ?
			// trim any spaces off of all items; add a trailing comma for fast lookups
			bc.cssImportIgnore.split(",").map(function(item){return lang.trim(item);}).join(",") + "," :
			""),

		cleanCssUrlQuotes = function(url){
			// If an URL from a CSS url value contains start/end quotes, remove them.
			// This is not done in the regexp, since the CSS spec allows for ' and " in the URL
			// which makes the regex overly complicated if they are backslash escaped.

			url = lang.trim(url);
			if(url.charAt(0) == "'" || url.charAt(0) == '"'){
				url = url.substring(1, url.length - 1);
			}
			return url;
		},

		removeComments = function(text, filename){
			var originalText = text,
				startIndex = -1,
				endIndex;
			while((startIndex = text.indexOf("/*")) != -1){
				endIndex = text.indexOf("*/", startIndex + 2);
				if(endIndex == -1){
					bc.log("cssOptimizeImproperComment", ["CSS file", filename]);
					return originalText;
				}
				text = text.substring(0, startIndex) + text.substring(endIndex + 2, text.length);
			}
			return text;
		},

		isRelative = function(url){
			var colonIndex = url.indexOf(":");
			return url.charAt(0) != "/" && (colonIndex == -1 || colonIndex > url.indexOf("/"));
		},

		getDestRelativeFilename = function(dest, relativeResource){
			var referenceSegments = dest.split("/"),
				relativeSegments = relativeResource.dest.split("/");
			referenceSegments.pop();
			while(referenceSegments.length && relativeSegments.length && referenceSegments[0]==relativeSegments[0]){
				referenceSegments.shift();
				relativeSegments.shift();
			}
			for(var i = 0; i<referenceSegments.length; i++){
				relativeSegments.unshift("..");
			}
			return relativeSegments.join("/");
		},

		getDestRelativeUrlFromSrcUrl = function(dest, fullSrcFilename, msgInfo){
			var relativeResource = bc.resources[fullSrcFilename];
			if(relativeResource){
				return getDestRelativeFilename(dest, relativeResource);
			}else{
				bc.log("cssOptimizeUnableToResolveURL", msgInfo);
			}
			return 0;
		},

		flattenCss = function(resource){
			if(resource.optimizedText){
				return;
			}
			var dest = resource.dest,
				src = resource.src,
				srcReferencePath = fileUtils.getFilepath(checkSlashes(src)),
				text = resource.text;
			text = text.replace(/^\uFEFF/, ''); // remove BOM
			text = removeComments(text, src);
			text = text.replace(cssImportRegExp, function(fullMatch, urlStart, importUrl, urlEnd, mediaTypes){
				importUrl = checkSlashes(cleanCssUrlQuotes(importUrl));
				var fixedRelativeUrl,
					fullSrcFilename = (isRelative(importUrl) ? fileUtils.compactPath(fileUtils.catPath(srcReferencePath, importUrl)) : importUrl),
					importResource = bc.resources[fullSrcFilename],
					ignore = false;

				// don't expand if explicitly instructed not to by build control
				if(
					(cssImportIgnore && cssImportIgnore.indexOf(importUrl + ",") != -1) || // the v1.6- technique
					(importResource && importResource.tag.importIgnore)                    // the v1.8+ technique
				 ){
					ignore = true;
					bc.log("cssOptimizeIgnored", ["CSS file", src, "import directive", fullMatch]);
				}

				// don't expand if multiple media types given
				if(mediaTypes && lang.trim(mediaTypes)!="all"){
					ignore = true;
					bc.log("cssOptimizeIgnoredMultiMediaTypes", ["CSS file", src, "import directive", fullMatch]);
				}

				// even if not expanding, make sure relative urls are adjusted correctly
				if(ignore){
					if(isRelative(importUrl) && (fixedRelativeUrl = getDestRelativeUrlFromSrcUrl(dest, fullSrcFilename, ["CSS file", src, "import directive", fullMatch]))){
						return '@import url("' + fixedRelativeUrl + '")' + (mediaTypes || "") + ";";
					}else{
						// right or wrong, this is our only choice at this point
						return fullMatch;
					}
				}

				// at this point, we want to expand the import into the calling resource

				if(!importResource){
					bc.log("cssOptimizeIgnoredNoResource", ["CSS file", src, "import directive", fullMatch]);
					return fullMatch;
				}

				flattenCss(importResource);
				var importContents = importResource.optimizedText;

				// since importContents is flattened, all relative urls are computed with respect to the destination location of importResource
				// these urls need to be adjusted with respect to resource
				var importResourceDestPath = fileUtils.getFilepath(importResource.dest);
				return importContents.replace(cssUrlRegExp, function(fullMatch, urlMatch){
					var fixedUrl = checkSlashes(cleanCssUrlQuotes(urlMatch));
					if(isRelative(fixedUrl)){
						var fullDestFilename = fileUtils.compactPath(fileUtils.catPath(importResourceDestPath, fixedUrl)),
							relativeResource = bc.resourcesByDest[fullDestFilename];
						if(!relativeResource){
							bc.log("cssOptimizeUnableToResolveURL", ["CSS file", src, "import", importResource.src, "relative URL", fullMatch]);
						}else{
							return 'url("' + getDestRelativeFilename(resource.dest, relativeResource) + '")';
						}
					}
					// right or wrong, this is our only choice at this point
					return fullMatch;
				});
			});

			if(/keepLines/i.test(bc.cssOptimize)){
				// remove multiple empty lines.
				text = text.replace(/(\r\n)+/g, "\r\n").replace(/\n+/g, "\n");
			}else{
				// remove newlines and extra spaces
				text = text.replace(/[\r\n]/g, "").replace(/\s+/g, " ").replace(/\{\s/g, "{").replace(/\s\}/g, "}");
			}

			resource.optimizedText = text;
			if(!resource.tag.noOptimize){
				resource.rawText = resource.text;
				resource.text = text;
			}
		};

	return function(resource, callback) {
		try{
			if(bc.cssOptimize && !resource.tag.noOptimize){
				flattenCss(resource);
				bc.log("cssOptimize", ["file", resource.src]);
			}
		}catch(e){
			bc.log("cssOptimizeFailed", ["file", resource.src, "error", e]);
		}
	};
});
