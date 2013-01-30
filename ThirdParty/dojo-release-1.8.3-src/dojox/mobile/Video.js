define([
	"dojo/_base/declare",
	"dojo/_base/sniff",
	"./Audio"
], function(declare, has, Audio){
	// module:
	//		dojox/mobile/Video

	return declare("dojox.mobile.Video", Audio, {
		// summary:
		//		A thin wrapper around the HTML5 `<video>` element.
		
		// width: String
		//		The width of the embed element.
		width: "200px",

		// height: String
		//		The height of the embed element.
		height: "150px",

		_tag: "video",

		_getEmbedRegExp: function(){
			return has('ff') ? /video\/mp4/i :
				   has.isIE >= 9 ? /video\/webm/i :
				   //has("safari") ? /video\/webm/i : //Google is gooing to provide webm plugin for safari
				   null;
		}
	});
});
