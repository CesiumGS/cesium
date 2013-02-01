define([
	"dojo/_base/kernel",
	"dojo/_base/declare",
	"dojo/_base/window",
	"dojo/dom-construct"
], function(kernel, declare, win, domConstruct){
	// module:
	//		dojox/mobile/_ExecScriptMixin

	return declare("dojox.mobile._ExecScriptMixin", null, {
		// summary:
		//		Mixin for providing script execution capability to content handlers.
		// description:
		//		This module defines the execScript method, which is called
		//		from an HTML content handler.

		execScript: function(/*String*/ html){
			// summary:
			//		Finds script tags and executes the script.
			// html: String
			//		The HTML input.
			// returns: String
			//		The given HTML text from which &lt;script&gt; blocks are removed.
			var s = html.replace(/\f/g, " ").replace(/<\/script>/g, "\f");
			s = s.replace(/<script [^>]*src=['"]([^'"]+)['"][^>]*>([^\f]*)\f/ig, function(ignore, path){
				domConstruct.create("script", {
					type: "text/javascript",
					src: path}, win.doc.getElementsByTagName("head")[0]);
				return "";
			});

			s = s.replace(/<script>([^\f]*)\f/ig, function(ignore, code){
				kernel.eval(code);
				return "";
			});

			return s;
		}
	});
});
