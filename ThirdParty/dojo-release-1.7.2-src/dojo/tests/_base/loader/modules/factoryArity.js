// make sure that module.exports doesn't kill factory result since factory has arity<3
define(function() { return {i : 5} ; });