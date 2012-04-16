/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.html.entities"]){
dojo._hasResource["dojox.html.entities"]=true;
dojo.provide("dojox.html.entities");
(function(){
var _1=function(_2,_3){
var _4,_5;
if(_3._encCache&&_3._encCache.regexp&&_3._encCache.mapper&&_3.length==_3._encCache.length){
_4=_3._encCache.mapper;
_5=_3._encCache.regexp;
}else{
_4={};
_5=["["];
var i;
for(i=0;i<_3.length;i++){
_4[_3[i][0]]="&"+_3[i][1]+";";
_5.push(_3[i][0]);
}
_5.push("]");
_5=new RegExp(_5.join(""),"g");
_3._encCache={mapper:_4,regexp:_5,length:_3.length};
}
_2=_2.replace(_5,function(c){
return _4[c];
});
return _2;
};
var _6=function(_7,_8){
var _9,_a;
if(_8._decCache&&_8._decCache.regexp&&_8._decCache.mapper&&_8.length==_8._decCache.length){
_9=_8._decCache.mapper;
_a=_8._decCache.regexp;
}else{
_9={};
_a=["("];
var i;
for(i=0;i<_8.length;i++){
var e="&"+_8[i][1]+";";
if(i){
_a.push("|");
}
_9[e]=_8[i][0];
_a.push(e);
}
_a.push(")");
_a=new RegExp(_a.join(""),"g");
_8._decCache={mapper:_9,regexp:_a,length:_8.length};
}
_7=_7.replace(_a,function(c){
return _9[c];
});
return _7;
};
dojox.html.entities.html=[["&","amp"],["\"","quot"],["<","lt"],[">","gt"],[" ","nbsp"]];
dojox.html.entities.latin=[["¡","iexcl"],["¢","cent"],["£","pound"],["€","euro"],["¤","curren"],["¥","yen"],["¦","brvbar"],["§","sect"],["¨","uml"],["©","copy"],["ª","ordf"],["«","laquo"],["¬","not"],["­","shy"],["®","reg"],["¯","macr"],["°","deg"],["±","plusmn"],["²","sup2"],["³","sup3"],["´","acute"],["µ","micro"],["¶","para"],["·","middot"],["¸","cedil"],["¹","sup1"],["º","ordm"],["»","raquo"],["¼","frac14"],["½","frac12"],["¾","frac34"],["¿","iquest"],["À","Agrave"],["Á","Aacute"],["Â","Acirc"],["Ã","Atilde"],["Ä","Auml"],["Å","Aring"],["Æ","AElig"],["Ç","Ccedil"],["È","Egrave"],["É","Eacute"],["Ê","Ecirc"],["Ë","Euml"],["Ì","Igrave"],["Í","Iacute"],["Î","Icirc"],["Ï","Iuml"],["Ð","ETH"],["Ñ","Ntilde"],["Ò","Ograve"],["Ó","Oacute"],["Ô","Ocirc"],["Õ","Otilde"],["Ö","Ouml"],["×","times"],["Ø","Oslash"],["Ù","Ugrave"],["Ú","Uacute"],["Û","Ucirc"],["Ü","Uuml"],["Ý","Yacute"],["Þ","THORN"],["ß","szlig"],["à","agrave"],["á","aacute"],["â","acirc"],["ã","atilde"],["ä","auml"],["å","aring"],["æ","aelig"],["ç","ccedil"],["è","egrave"],["é","eacute"],["ê","ecirc"],["ë","euml"],["ì","igrave"],["í","iacute"],["î","icirc"],["ï","iuml"],["ð","eth"],["ñ","ntilde"],["ò","ograve"],["ó","oacute"],["ô","ocirc"],["õ","otilde"],["ö","ouml"],["÷","divide"],["ø","oslash"],["ù","ugrave"],["ú","uacute"],["û","ucirc"],["ü","uuml"],["ý","yacute"],["þ","thorn"],["ÿ","yuml"],["ƒ","fnof"],["Α","Alpha"],["Β","Beta"],["Γ","Gamma"],["Δ","Delta"],["Ε","Epsilon"],["Ζ","Zeta"],["Η","Eta"],["Θ","Theta"],["Ι","Iota"],["Κ","Kappa"],["Λ","Lambda"],["Μ","Mu"],["Ν","Nu"],["Ξ","Xi"],["Ο","Omicron"],["Π","Pi"],["Ρ","Rho"],["Σ","Sigma"],["Τ","Tau"],["Υ","Upsilon"],["Φ","Phi"],["Χ","Chi"],["Ψ","Psi"],["Ω","Omega"],["α","alpha"],["β","beta"],["γ","gamma"],["δ","delta"],["ε","epsilon"],["ζ","zeta"],["η","eta"],["θ","theta"],["ι","iota"],["κ","kappa"],["λ","lambda"],["μ","mu"],["ν","nu"],["ξ","xi"],["ο","omicron"],["π","pi"],["ρ","rho"],["ς","sigmaf"],["σ","sigma"],["τ","tau"],["υ","upsilon"],["φ","phi"],["χ","chi"],["ψ","psi"],["ω","omega"],["ϑ","thetasym"],["ϒ","upsih"],["ϖ","piv"],["•","bull"],["…","hellip"],["′","prime"],["″","Prime"],["‾","oline"],["⁄","frasl"],["℘","weierp"],["ℑ","image"],["ℜ","real"],["™","trade"],["ℵ","alefsym"],["←","larr"],["↑","uarr"],["→","rarr"],["↓","darr"],["↔","harr"],["↵","crarr"],["⇐","lArr"],["⇑","uArr"],["⇒","rArr"],["⇓","dArr"],["⇔","hArr"],["∀","forall"],["∂","part"],["∃","exist"],["∅","empty"],["∇","nabla"],["∈","isin"],["∉","notin"],["∋","ni"],["∏","prod"],["∑","sum"],["−","minus"],["∗","lowast"],["√","radic"],["∝","prop"],["∞","infin"],["∠","ang"],["∧","and"],["∨","or"],["∩","cap"],["∪","cup"],["∫","int"],["∴","there4"],["∼","sim"],["≅","cong"],["≈","asymp"],["≠","ne"],["≡","equiv"],["≤","le"],["≥","ge"],["⊂","sub"],["⊃","sup"],["⊄","nsub"],["⊆","sube"],["⊇","supe"],["⊕","oplus"],["⊗","otimes"],["⊥","perp"],["⋅","sdot"],["⌈","lceil"],["⌉","rceil"],["⌊","lfloor"],["⌋","rfloor"],["〈","lang"],["〉","rang"],["◊","loz"],["♠","spades"],["♣","clubs"],["♥","hearts"],["♦","diams"],["Œ","Elig"],["œ","oelig"],["Š","Scaron"],["š","scaron"],["Ÿ","Yuml"],["ˆ","circ"],["˜","tilde"],[" ","ensp"],[" ","emsp"],[" ","thinsp"],["‌","zwnj"],["‍","zwj"],["‎","lrm"],["‏","rlm"],["–","ndash"],["—","mdash"],["‘","lsquo"],["’","rsquo"],["‚","sbquo"],["“","ldquo"],["”","rdquo"],["„","bdquo"],["†","dagger"],["‡","Dagger"],["‰","permil"],["‹","lsaquo"],["›","rsaquo"]];
dojox.html.entities.encode=function(_b,m){
if(_b){
if(!m){
_b=_1(_b,dojox.html.entities.html);
_b=_1(_b,dojox.html.entities.latin);
}else{
_b=_1(_b,m);
}
}
return _b;
};
dojox.html.entities.decode=function(_c,m){
if(_c){
if(!m){
_c=_6(_c,dojox.html.entities.html);
_c=_6(_c,dojox.html.entities.latin);
}else{
_c=_6(_c,m);
}
}
return _c;
};
})();
}
