/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.highlight.languages.django"]){
dojo._hasResource["dojox.highlight.languages.django"]=true;
dojo.provide("dojox.highlight.languages.django");
dojo.require("dojox.highlight._base");
dojo.require("dojox.highlight.languages.xml");
dojo.require("dojox.highlight.languages.html");
(function(){
var dh=dojox.highlight,_1=dh.constants,_2=dh.languages,x=_2.xml,h=_2.html;
_2.django={defaultMode:{contains:["tag","comment","doctype","template_comment","template_tag","variable"]},case_insensitive:true,modes:[x.XML_COMMENT,h.HTML_DOCTYPE,{className:"tag",lexems:[_1.IDENT_RE],keywords:h.HTML_TAGS,begin:"<[A-Za-z/]",end:">",contains:["attribute","template_comment","template_tag","variable"]},x.XML_ATTR,h.HTML_ATTR,{className:"value",begin:"\"",end:"\"",contains:["template_comment","template_tag","variable"]},h.HTML_VALUE,{className:"template_comment",begin:"\\{\\%\\s*comment\\s*\\%\\}",end:"\\{\\%\\s*endcomment\\s*\\%\\}"},{className:"template_comment",begin:"\\{#",end:"#\\}"},{className:"template_tag",begin:"\\{\\%",end:"\\%\\}",lexems:[_1.IDENT_RE],keywords:{"comment":1,"endcomment":1,"load":1,"templatetag":1,"ifchanged":1,"endifchanged":1,"if":1,"endif":1,"firstof":1,"for":1,"endfor":1,"in":1,"ifnotequal":1,"endifnotequal":1,"widthratio":1,"extends":1,"include":1,"spaceless":1,"endspaceless":1,"regroup":1,"by":1,"as":1,"ifequal":1,"endifequal":1,"ssi":1,"now":1,"with":1,"cycle":1,"url":1,"filter":1,"endfilter":1,"debug":1,"block":1,"endblock":1,"else":1},contains:["filter"]},{className:"variable",begin:"\\{\\{",end:"\\}\\}",contains:["filter"]},{className:"filter",begin:"\\|[A-Za-z]+\\:?",end:"^",excludeEnd:true,lexems:[_1.IDENT_RE],keywords:{"truncatewords":1,"removetags":1,"linebreaksbr":1,"yesno":1,"get_digit":1,"timesince":1,"random":1,"striptags":1,"filesizeformat":1,"escape":1,"linebreaks":1,"length_is":1,"ljust":1,"rjust":1,"cut":1,"urlize":1,"fix_ampersands":1,"title":1,"floatformat":1,"capfirst":1,"pprint":1,"divisibleby":1,"add":1,"make_list":1,"unordered_list":1,"urlencode":1,"timeuntil":1,"urlizetrunc":1,"wordcount":1,"stringformat":1,"linenumbers":1,"slice":1,"date":1,"dictsort":1,"dictsortreversed":1,"default_if_none":1,"pluralize":1,"lower":1,"join":1,"center":1,"default":1,"truncatewords_html":1,"upper":1,"length":1,"phone2numeric":1,"wordwrap":1,"time":1,"addslashes":1,"slugify":1,"first":1},contains:["argument"]},{className:"argument",begin:"\"",end:"\""}]};
})();
}
