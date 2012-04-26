/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.dtl.HtmlInline"]){
dojo._hasResource["dojox.dtl.HtmlInline"]=true;
dojo.provide("dojox.dtl.HtmlInline");
dojo.require("dojox.dtl.DomInline");
dojo.deprecated("dojox.dtl.html","All packages and classes in dojox.dtl that start with Html or html have been renamed to Dom or dom");
dojox.dtl.HtmlInline=dojox.dtl.DomInline;
dojox.dtl.HtmlInline.prototype.declaredClass="dojox.dtl.HtmlInline";
}
