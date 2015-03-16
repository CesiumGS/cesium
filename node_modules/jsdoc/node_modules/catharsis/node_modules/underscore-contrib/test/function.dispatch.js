$(document).ready(function() {

  module("underscore.function.dispatch");

  test('attempt', function() {
    var obj = {x: '', y: function() { return true; }, z: function() { return _.toArray(arguments).join(''); }};
    strictEqual(_.attempt(obj, 'x'), undefined);
    strictEqual(_.attempt(obj, 'y'), true);
    strictEqual(_.attempt(obj, 'z', 1, 2, 3), '123');
    strictEqual(_.attempt(null, 'x'), undefined);
    strictEqual(_.attempt(undefined, 'x'), undefined);
  });

});
