/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.highlight.languages.python"]){
dojo._hasResource["dojox.highlight.languages.python"]=true;
dojo.provide("dojox.highlight.languages.python");
dojo.require("dojox.highlight._base");
(function(){
var dh=dojox.highlight,_1=dh.constants;
dh.languages.python={defaultMode:{lexems:[_1.UNDERSCORE_IDENT_RE],illegal:"(</|->)",contains:["comment","string","function","class","number","decorator"],keywords:{"and":1,"elif":1,"is":1,"global":1,"as":1,"in":1,"if":1,"from":1,"raise":1,"for":1,"except":1,"finally":1,"print":1,"import":1,"pass":1,"None":1,"return":1,"exec":1,"else":1,"break":1,"not":1,"with":1,"class":1,"assert":1,"yield":1,"try":1,"while":1,"continue":1,"del":1,"or":1,"def":1,"lambda":1}},modes:[{className:"function",lexems:[_1.UNDERSCORE_IDENT_RE],begin:"\\bdef ",end:":",illegal:"$",keywords:{"def":1},contains:["title","params"],relevance:10},{className:"class",lexems:[_1.UNDERSCORE_IDENT_RE],begin:"\\bclass ",end:":",illegal:"[${]",keywords:{"class":1},contains:["title","params"],relevance:10},{className:"title",begin:_1.UNDERSCORE_IDENT_RE,end:"^"},{className:"params",begin:"\\(",end:"\\)",contains:["string"]},_1.HASH_COMMENT_MODE,_1.C_NUMBER_MODE,{className:"string",begin:"'''",end:"'''",relevance:10},{className:"string",begin:"\"\"\"",end:"\"\"\"",relevance:10},_1.APOS_STRING_MODE,_1.QUOTE_STRING_MODE,_1.BACKSLASH_ESCAPE,{className:"string",begin:"r'",end:"'",relevance:10},{className:"string",begin:"r\"",end:"\"",relevance:10},{className:"string",begin:"u'",end:"(^|[^\\\\])'",relevance:10},{className:"string",begin:"u\"",end:"(^|[^\\\\])\"",relevance:10},{className:"string",begin:"ur'",end:"'",relevance:10},{className:"string",begin:"ur\"",end:"\"",relevance:10},{className:"decorator",begin:"@",end:"$"}]};
})();
}
