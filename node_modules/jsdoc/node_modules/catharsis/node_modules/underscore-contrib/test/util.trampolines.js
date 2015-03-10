$(document).ready(function() {

  module("underscore.util.trampolines");

  test("trampoline", function() {
    var oddOline = function(n) {
      if (n === 0)
        return _.done(false);
      else
        return _.partial(evenOline, Math.abs(n) - 1);
    };

    var evenOline = function(n) {
      if (n === 0)
        return _.done(true);
      else
        return _.partial(oddOline, Math.abs(n) - 1);
    };

    equal(_.trampoline(evenOline, 55000), true, 'should trampoline two mutually recursive functions');
    equal(_.trampoline(evenOline, 0), true, 'should trampoline two mutually recursive functions');
    equal(_.trampoline(evenOline, 111111), false, 'should trampoline two mutually recursive functions');
    equal(_.trampoline(oddOline, 1), true, 'should trampoline two mutually recursive functions');
    equal(_.trampoline(oddOline, 11111), true, 'should trampoline two mutually recursive functions');
    equal(_.trampoline(oddOline, 22), false, 'should trampoline two mutually recursive functions');
  });

});
