/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.dtl._HtmlTemplated"]){
dojo._hasResource["dojox.dtl._HtmlTemplated"]=true;
dojo.provide("dojox.dtl._HtmlTemplated");
dojo.require("dojox.dtl._DomTemplated");
dojo.deprecated("dojox.dtl.html","All packages and classes in dojox.dtl that start with Html or html have been renamed to Dom or dom");
dojox.dtl._HtmlTemplated=dojox.dtl._DomTemplated;
dojox.dtl._HtmlTemplated.prototype.declaredClass="dojox.dtl._HtmlTemplated";
}
