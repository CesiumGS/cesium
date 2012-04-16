/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.highlight.languages.html"]){
dojo._hasResource["dojox.highlight.languages.html"]=true;
dojo.provide("dojox.highlight.languages.html");
dojo.require("dojox.highlight._base");
dojo.require("dojox.highlight.languages.xml");
(function(){
var _1={"code":1,"kbd":1,"font":1,"noscript":1,"style":1,"img":1,"title":1,"menu":1,"tt":1,"tr":1,"param":1,"li":1,"tfoot":1,"th":1,"input":1,"td":1,"dl":1,"blockquote":1,"fieldset":1,"big":1,"dd":1,"abbr":1,"optgroup":1,"dt":1,"button":1,"isindex":1,"p":1,"small":1,"div":1,"dir":1,"em":1,"frame":1,"meta":1,"sub":1,"bdo":1,"label":1,"acronym":1,"sup":1,"body":1,"xml":1,"basefont":1,"base":1,"br":1,"address":1,"strong":1,"legend":1,"ol":1,"script":1,"caption":1,"s":1,"col":1,"h2":1,"h3":1,"h1":1,"h6":1,"h4":1,"h5":1,"table":1,"select":1,"noframes":1,"span":1,"area":1,"dfn":1,"strike":1,"cite":1,"thead":1,"head":1,"option":1,"form":1,"hr":1,"var":1,"link":1,"b":1,"colgroup":1,"ul":1,"applet":1,"del":1,"iframe":1,"pre":1,"frameset":1,"ins":1,"tbody":1,"html":1,"samp":1,"map":1,"object":1,"a":1,"xmlns":1,"center":1,"textarea":1,"i":1,"q":1,"u":1};
var _2={className:"doctype",begin:"<!DOCTYPE",end:">",relevance:10};
var _3={className:"attribute",begin:" [a-zA-Z]+",end:"^"};
var _4={className:"value",begin:"[a-zA-Z0-9]+",end:"^"};
var dh=dojox.highlight,_5=dh.constants,_6=dh.languages,x=_6.xml;
_6.html={defaultMode:{contains:["tag","comment","doctype"]},case_insensitive:true,modes:[x.XML_COMMENT,_2,{className:"tag",lexems:[_5.IDENT_RE],keywords:_1,begin:"<[A-Za-z/]",end:">",contains:["attribute"],illegal:"[\\+\\.]"},x.XML_ATTR,_3,x.XML_VALUE,_4],HTML_TAGS:_1,HTML_DOCTYPE:_2,HTML_ATTR:_3,HTML_VALUE:_4};
})();
}
