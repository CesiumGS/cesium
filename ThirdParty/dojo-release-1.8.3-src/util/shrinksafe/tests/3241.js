result = "";

(function() {
function MyClass(){
    this.foo = function(argument1, argument2){
            var mytest = test;
			return mytest;
    }
    this.bar = function(){}
}
var test = "data";

result = new MyClass().foo();
})();
