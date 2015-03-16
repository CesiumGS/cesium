$(document).ready(function() {
  
  function sum (x, y) { return x + y; }
  function square (x) { return x * x; }
  function odd (x) { return x % 2 === 1; }
  function naturalSmallerThan (x)  { return _.iterators.List(_.range(0, x)); }


  module("underscore.function.iterators");

  test("List", function() {
    var i = _.iterators.List([1, 2, 3, 4, 5]);
    equal(i(), 1, "should return the first element of the underlying array");
    equal(i(), 2, "should return the next element of the underlying array");
    equal(i(), 3, "should return the next element of the underlying array");
    equal(i(), 4, "should return the next element of the underlying array");
    equal(i(), 5, "should return the next element of the underlying array");
    equal(i(), void 0, "should return undefined when out of elements");
    
    i = _.iterators.List([1, [2, 3, [4]], 5]);
    equal(i(), 1, "should return the first element of the underlying array");
    notEqual(i(), 2, "should not do a deep traverse");
    equal(i(), 5, "should return the next element of the underlying array");
    equal(i(), void 0, "should return undefined when out of elements");
    
    i = _.iterators.List([]);
    equal(i(), void 0, "should return undefined when there are no elements");
  
    i = _.iterators.List([[], [[]]]);
    notEqual(i(), void 0, "should have a values given an empty tree");
  });

  test("Tree", function () {
    var i = _.iterators.Tree([]);
    equal(i(), void 0, "should return undefined for an empty array");
  
    i = _.iterators.Tree([[], [[]]]);
    equal(i(), void 0, "should return undefined for an empty tree");
  
    i = _.iterators.Tree([1, 2, 3, 4, 5]);
    equal(i(), 1, "should return the first element of the underlying array");
    equal(i(), 2, "should return the next element of the underlying array");
    equal(i(), 3, "should return the next element of the underlying array");
    equal(i(), 4, "should return the next element of the underlying array");
    equal(i(), 5, "should return the next element of the underlying array");
    equal(i(), void 0, "should return undefined when out of elements");
    
    i = _.iterators.Tree([1, [2, 3, [4]], 5]);
    equal(i(), 1, "should return the first element of the underlying array");
    equal(i(), 2, "should return the next element of the underlying array");
    equal(i(), 3, "should return the next element of the underlying array");
    equal(i(), 4, "should return the next element of the underlying array");
    equal(i(), 5, "should return the next element of the underlying array");
    equal(i(), void 0, "should return undefined when out of elements");
  });
  
  test("Reduce", function () {
    
    equal( _.iterators.reduce(_.iterators.Tree([1, [2, 3, [4]], 5]), sum, 0), 15, "should fold an iterator with many elements");

    equal( _.iterators.reduce(_.iterators.Tree([[[4], []]]), sum, 42), 46, "should fold an iterator with one element");

    equal( _.iterators.reduce(_.iterators.Tree([[], [[]]]), sum, 42), 42, "should fold an empty iterator");
      
    equal( _.iterators.reduce(_.iterators.Tree([1, [2, 3, [4]], 5]), sum), 15, "should fold an array with two or more elements");
      
    equal( _.iterators.reduce(_.iterators.Tree([[[4], []]]), sum), 4, "should fold an array with one element");
      
    equal( _.iterators.reduce(_.iterators.Tree([[[], []]]), sum), void 0, "should fold an array with no elements");
  });
  
  test("Accumulate", function () {
    var i = _.iterators.accumulate(_.iterators.Tree([1, [2, 3, [4]], 5]), sum, 0);
    equal(i(), 1, "should map an iterator with many elements");
    equal(i(), 3, "should map an iterator with many elements");
    equal(i(), 6, "should map an iterator with many elements");
    equal(i(), 10, "should map an iterator with many elements");
    equal(i(), 15, "should map an iterator with many elements");
    equal(i(), void 0);
  
    i = _.iterators.accumulate(_.iterators.Tree([[[4], []]]), sum, 42);
    equal(i(), 46, "should map an iterator with one element");
    equal(i(), void 0);
  
    i = _.iterators.accumulate(_.iterators.Tree([[[], []]]), sum, 42);
    equal(i(), void 0, "should map an empty iterator");
      
    i = _.iterators.accumulate(_.iterators.Tree([1, [2, 3, [4]], 5]), sum);
    equal(i(), 1, "should map an iterator with many elements");
    equal(i(), 3, "should map an iterator with many elements");
    equal(i(), 6, "should map an iterator with many elements");
    equal(i(), 10, "should map an iterator with many elements");
    equal(i(), 15, "should map an iterator with many elements");
    equal(i(), void 0);
  
    i = _.iterators.accumulate(_.iterators.Tree([[[4], []]]), sum);
    equal(i(), 4, "should map an iterator with one element");
    equal(i(), void 0);
  
    i = _.iterators.accumulate(_.iterators.Tree([[[], []]]), sum);
    equal(i(), void 0);
    
  });
  
  test("Map", function () {
    var i = _.iterators.map(_.iterators.Tree([1, [2, 3, [4]], 5]), square);
    equal(i(), 1, "should map an iterator with many elements");
    equal(i(), 4, "should map an iterator with many elements");
    equal(i(), 9, "should map an iterator with many elements");
    equal(i(), 16, "should map an iterator with many elements");
    equal(i(), 25, "should map an iterator with many elements");
    equal(i(), void 0);
  
    i = _.iterators.map(_.iterators.Tree([[[4], []]]), square);
    equal(i(), 16, "should map an iterator with one element");
    equal(i(), void 0);
  
    i = _.iterators.map(_.iterators.Tree([[[], []]]), square);
    equal(i(), void 0, "should map an empty iterator");
  });

  test("mapcat", function () {
    var i = _.iterators.mapcat(_.iterators.Tree([1, [2]]), naturalSmallerThan);
    equal(i(), 0, "should mapcat an iterator with many elements");
    equal(i(), 0, "should mapcat an iterator with many elements");
    equal(i(), 1, "should mapcat an iterator with many elements");
    equal(i(), void 0);

    i = _.iterators.mapcat(_.iterators.Tree([[[1], []]]), naturalSmallerThan);
    equal(i(), 0, "should mapcat an iterator with one element");
    equal(i(), void 0);

    i = _.iterators.mapcat(_.iterators.Tree([[[], []]]), naturalSmallerThan);
    equal(i(), void 0, "should mapcat an empty iterator");
  });

  test("filter", function() {
    var i = _.iterators.filter(_.iterators.Tree([1, [2, 3, [4]], 5]), odd);
    equal(i(),1);
    equal(i(),3);
    equal(i(),5);
    equal(i(),void 0);
    
    i = _.iterators.filter(_.iterators.Tree([[[4], []]]), odd);
    equal(i(),void 0);
    
    i = _.iterators.filter(_.iterators.Tree([[[], []]]), odd);
    equal(i(),void 0);
    
    i = _.iterators.filter(_.iterators.List([2, 4, 6, 8, 10]), odd);
    equal(i(),void 0);
  });

  test("slice", function() {
    expect(0);
    test("with two parameter", function() {
      expect(0);
      test("should return an identity iterator", function() {
        var i = _.iterators.slice(_.iterators.List([1, 2, 3, 4, 5]), 0);
        equal(i(),1);
        equal(i(),2);
        equal(i(),3);
        equal(i(),4);
        equal(i(),5);
        equal(i(),void 0);
      });
      test("should return a trailing iterator", function() {
        var i = _.iterators.slice(_.iterators.List([1, 2, 3, 4, 5]), 1);
        equal(i(),2);
        equal(i(),3);
        equal(i(),4);
        equal(i(),5);
        equal(i(),void 0);
      });
      test("should return an empty iterator when out of range", function() {
        var i = _.iterators.slice(_.iterators.List([1, 2, 3, 4, 5]), 5);
        equal(i(),void 0);
      });
    });
    test("with three parameters", function() {
      expect(0);
      test("should return an identity iterator", function() {
        var i = _.iterators.slice(_.iterators.List([1, 2, 3, 4, 5]), 0, 5);
        equal(i(),1);
        equal(i(),2);
        equal(i(),3);
        equal(i(),4);
        equal(i(),5);
        equal(i(),void 0);
        i = _.iterators.slice(_.iterators.List([1, 2, 3, 4, 5]), 0, 99);
        equal(i(),1);
        equal(i(),2);
        equal(i(),3);
        equal(i(),4);
        equal(i(),5);
        equal(i(),void 0);
      });
      test("should return a leading iterator", function() {
        var i = _.iterators.slice(_.iterators.List([1, 2, 3, 4, 5]), 0, 4);
        equal(i(),1);
        equal(i(),2);
        equal(i(),3);
        equal(i(),4);
        equal(i(),void 0);
      });
      test("should return a trailing iterator", function() {
        var i = _.iterators.slice(_.iterators.List([1, 2, 3, 4, 5]), 1, 4);
        equal(i(),2);
        equal(i(),3);
        equal(i(),4);
        equal(i(),5);
        equal(i(),void 0);
        i = _.iterators.slice(_.iterators.List([1, 2, 3, 4, 5]), 1, 99);
        equal(i(),2);
        equal(i(),3);
        equal(i(),4);
        equal(i(),5);
        equal(i(),void 0);
      });
      test("should return an inner iterator", function() {
        var i = _.iterators.slice(_.iterators.List([1, 2, 3, 4, 5]), 1, 3);
        equal(i(),2);
        equal(i(),3);
        equal(i(),4);
        equal(i(),void 0);
      });
      test("should return an empty iterator when given a zero length", function() {
        var i = _.iterators.slice(_.iterators.List([1, 2, 3, 4, 5]), 1, 0);
        equal(i(),void 0);
      });
      test("should return an empty iterator when out of range", function() {
        var i = _.iterators.slice(_.iterators.List([1, 2, 3, 4, 5]), 5, 1);
        equal(i(),void 0);
      });
    });
  });

  test("drop", function() {
    expect(0);
    test("should drop the number of items dropped", function() {
      var i = _.iterators.drop(_.iterators.List([1, 2, 3, 4, 5]), 2);
      equal(i(),3);
      equal(i(),4);
      equal(i(),5);
      equal(i(),void 0);
    });
    test("should handle overdropping", function() {
      var i = _.iterators.drop(_.iterators.List([1, 2, 3, 4, 5]), 99);
      equal(i(),void 0);
    });
    test("should handle underdropping", function() {
      var i = _.iterators.drop(_.iterators.List([1, 2, 3, 4, 5]), 0);
      equal(i(),1);
      equal(i(),2);
      equal(i(),3);
      equal(i(),4);
      equal(i(),5);
      equal(i(),void 0);
    });
    test("should default to one", function() {
      var i = _.iterators.drop(_.iterators.List([1, 2, 3, 4, 5]));
      equal(i(),2);
      equal(i(),3);
      equal(i(),4);
      equal(i(),5);
      equal(i(),void 0);
    });
  });
  
  test("accumulateWithReturn", function() {
    expect(0);
    test("should pass the state and result in a pair", function() {
      var i = _.iterators.accumulateWithReturn(_.iterators.List([1, 2, 3, 4, 5]), function(state, element) {
        return [state + element, 'Total is ' + (state + element)];
      }, 0);
      equal(i(),'Total is 1');
      equal(i(),'Total is 3');
      equal(i(),'Total is 6');
      equal(i(),'Total is 10');
      equal(i(),'Total is 15');
    });
  });
  
  test("unfold", function() {
    expect(0);
    test("should unfold and include the seed", function() {
      var i = _.iterators.unfold(0, function(n) {
        return n + 1;
      });
      equal(i(),0);
      equal(i(),1);
      equal(i(),2);
    });
    test("should not unfold without a seed", function() {
      var i = _.iterators.unfold(void 0, function(n) {
        return n + 1;
      });
      equal(i(),void 0);
      equal(i(),void 0);
      equal(i(),void 0);
      equal(i(),void 0);
    });
  });
  
  test("unfoldWithReturn", function() {
    expect(0);
    test("should unfold and throw off a value", function() {
      var i = _.iterators.unfoldWithReturn(1, function(n) {
        return [n + 1, n * n];
      });
      equal(i(),1);
      equal(i(),4);
      equal(i(),9);
      equal(i(),16);
    });
    test("should halt if it returns undefined", function() {
      var i = _.iterators.unfoldWithReturn(1, function(n) {
        return [n + 1, n === 1 ? void 0 : n * n];
      });
      equal(i(),void 0);
      equal(i(),void 0);
      equal(i(),void 0);
      equal(i(),void 0);
    });
    test("should halt if the state becomes undefined", function() {
      var i = _.iterators.unfoldWithReturn(1, function(n) {
        return [(n === 3 ? void 0 : n + 1), (n === void 0 ? 100 : n * n)];
      });
      equal(i(),1);
      equal(i(),4);
      equal(i(),9);
      equal(i(),void 0);
    });
  });
  
});

