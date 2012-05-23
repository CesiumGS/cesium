// one would expect this to work. 
dojo.provide("util.docscripts.tests.alias");
(function(_dojo){

    dojo.sampleFunction = function(a, b, c){
        // summary: WTF
        return ""; // String
    }
    
})(dojo); // (this.dojo) works