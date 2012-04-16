/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.highlight.languages.cpp"]){
dojo._hasResource["dojox.highlight.languages.cpp"]=true;
dojo.provide("dojox.highlight.languages.cpp");
dojo.require("dojox.highlight._base");
(function(){
var dh=dojox.highlight,_1=dh.constants;
dh.languages.cpp={defaultMode:{lexems:[_1.UNDERSCORE_IDENT_RE],illegal:"</",contains:["comment","string","number","preprocessor"],keywords:{"false":1,"int":1,"float":1,"while":1,"private":1,"char":1,"catch":1,"export":1,"virtual":1,"operator":2,"sizeof":2,"dynamic_cast":2,"typedef":2,"const_cast":2,"const":1,"struct":1,"for":1,"static_cast":2,"union":1,"namespace":1,"unsigned":1,"long":1,"throw":1,"volatile":2,"static":1,"protected":1,"bool":1,"template":1,"mutable":1,"if":1,"public":1,"friend":2,"do":1,"return":1,"goto":1,"auto":1,"void":2,"enum":1,"else":1,"break":1,"new":1,"extern":1,"using":1,"true":1,"class":1,"asm":1,"case":1,"typeid":1,"short":1,"reinterpret_cast":2,"default":1,"double":1,"register":1,"explicit":1,"signed":1,"typename":1,"try":1,"this":1,"switch":1,"continue":1,"wchar_t":1,"inline":1,"delete":1}},modes:[_1.C_LINE_COMMENT_MODE,_1.C_BLOCK_COMMENT_MODE,_1.C_NUMBER_MODE,_1.QUOTE_STRING_MODE,_1.BACKSLASH_ESCAPE,{className:"string",begin:"'",end:"[^\\\\]'",illegal:"[^\\\\][^']"},{className:"preprocessor",begin:"#",end:"$"}]};
})();
}
