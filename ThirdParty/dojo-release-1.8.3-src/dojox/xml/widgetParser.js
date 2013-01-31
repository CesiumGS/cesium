define([
	"dojo/_base/lang",	// dojo.getObject
	"dojo/_base/window",	// dojo.doc
	"dojo/_base/sniff",	// dojo.isIE
	"dojo/query",
	"dojo/parser",
	"dojox/xml/parser"
], function(dojo, window, has, query, parser, dxparser){

var dXml = lang.getObject("dojox.xml", true);

/**
Take some sort of xml block
* like <dojo.button caption="blah"/> and turn
* it into a widget..
*/

	/**
	 * We want to support something like:
	 * <body>
	 * 	<script>
	 * 	<dijit.layout.SplitContainer>
	 * 		<dijit.button/>
	 * 		<div>...</div>
	 * 	</dijit.layout.SplitContainer>
	 * </body>
	 *
	 * This is very tricky because if we parse this as XML then the <div> tag
	 * is actually an XML tag, not an XML tag, which is problematic in at least
	 * IE.
	 *
	 * So the strategy is this, silly as it may be: Convert EVERYTHING to HTML
	 * nodes, including the dijit.layout.SplitContainer by converting it to a
	 * div with the dojoType. Then run it through the standard parser.
	 * The more HTML you have relative to XML the less extra overhead this is.
	 *
	 * For something that is all XML we could have a different approach,
	 * perhaps signified by a different type of script tag. In that case we
	 * could just instantiate all the elements without a sourceNodeRef and then
	 * add the top level components to the app.
	 *
	 * That is very straightforward but I haven't done it.
	 *
	 * Right now there is no mechanism to have an intermediary bridge between
	 * the XML and the widget, because we are relying on dojo.parser
	 * to do the instantiation. It isn't clear to me why we would want
	 * those bridges in this approach and not in that approach.
	 *
	 */

xXml.widgetParser = new function(){
	
	var d = dojo;
	
	this.parseNode = function(node){
		
		var toBuild = [];
		//TODO figure out the proper type
		d.query("script[type='text/xml']", node).forEach(function(script){
			toBuild.push.apply(toBuild, this._processScript(script));
		}, this).orphan();
		
		//instantiate everything at the end, doing it piecewise can give ID conflicts
		return d.parser.instantiate(toBuild);
	};

	this._processScript = function(script){
		//the text is either loaded from a separate file by the src
		//attribute or underneath the src tag
		var text = script.src ?  d._getText(script.src) : script.innerHTML || script.firstChild.nodeValue;
		var htmlNode = this.toHTML( dojox.xml.parser.parse(text).firstChild );
		
		//make the list BEFORE we copy things over to keep the query scope as
		//small as possible
		var ret = d.query('[dojoType]', htmlNode);
		//remove the script tag and replace with new HTML block
		query(">", htmlNode).place(script, "before")
		script.parentNode.removeChild(script);
		return ret;
	};
	
	/**
	 * Given an XML node converts it to HTML where the existing HTML
	 * is preserved and the dojo widget tags are converted to divs
	 * with dojoType on them.
	 */
	this.toHTML = function (/*XmlNode*/ node){
		var newNode;
		var nodeName = node.nodeName;
		var dd = window.doc;
		var type = node.nodeType;
		
		
		///node type 3 and 4 are text and cdata
		if(type >= 3){
			return dd.createTextNode( (type == 3 || type == 4) ? node.nodeValue : "" );
		}
		
		var localName = node.localName||nodeName.split(":").pop();
		
		//TODO:
		//		only check for namespace ONCE ever, instead of each time here,
		//		by mixing in the right check for each browser?
		var namespace = node.namespaceURI || (node.getNamespaceUri ? node.getNamespaceUri() : "");
		
		//TODO check for some real namespace
		if(namespace == "html"){
			newNode = dd.createElement(localName);
		}else{
			var dojoType = namespace + "." + localName;
			
			/**
			 * This is a horrible hack we need because creating a <div>
			 * with <option> children doesn't work well. Specifically with
			 * dojo.Declaration at some point the <option> tags get lost
			 * entirely so we need the parent of <option> tags to be <select>
			 * tags. (Not a problem outside of dojo.Delcaration)
			 * There are a couple other ways we could do this:
			 * 1. Look at the first element child to see if it is an option and
			 * if so create a <select> here.
			 * 2. When we add a child to parent fix up the parent then if the
			 * child is an <option> and the parent isn't a <select>.
			 * Both of those are a bit messy and slower than this.
			 *
			 * This is potentially a problem for other tag combinations as well,
			 * such as <tr> under a <table> or <li> under a <ul>/<ol>.
			 * (dojox.widget.SortList for example). Probably need a robust strategy for
			 * dealing with this. Worst case scenario for now is that user has to use
			 * html tag with dojoType for misbehaving widget.
			 */
			newNode = newNode || dd.createElement((dojoType == "dijit.form.ComboBox") ? "select" : "div");
			newNode.setAttribute("dojoType", dojoType);
		}
		
		// TODO:
		//		we should probably set this up different, mixin a function
		//		depending on if it is IE rather than checking every time here
		//		the xmlns problem and the style problem are both IE specific
		d.forEach(node.attributes, function(attr){
			// NOTE: IE always iterates *all* properties!!!
			var name = attr.name || attr.nodeName;
			var value = attr.value || attr.nodeValue;
			if(name.indexOf("xmlns") != 0){
				// style=blah blah blah is a problem, in IE if you use
				// setAttribute here you get all sorts of problems. Maybe it
				// would be better to just create a giant string of HTML
				// instead of an object graph, then set innerHTML on something
				// to get the object graph? That might be cleaner...  that way
				// is uses the browser HTML parsing exactly at is and won't
				// cause any sort of issues. We could just special case style
				// as well?
				if(has("ie") && name == "style"){
					newNode.style.setAttribute("cssText", value);
				}else{
					newNode.setAttribute(name, value);
				}
			}
		});
		d.forEach(node.childNodes, function(cn){
			var childNode = this.toHTML(cn);
			
			// script tags in IE don't like appendChild, innerHTML or innerText
			// so if we are creating one programatically set text instead
			// could special case this for IE only
			if(localName == "script"){
				newNode.text += childNode.nodeValue;
			}else{
				newNode.appendChild(childNode);
			}
		}, this);
		return newNode;
	};
	
}();

return dXml.widgetParser;

});
