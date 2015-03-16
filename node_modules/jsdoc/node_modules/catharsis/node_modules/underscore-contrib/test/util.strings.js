
$(document).ready(function() {

  module('underscore.util.strings');

  test('explode', function() {
    deepEqual(_.explode('Virgil'), ['V','i','r','g','i','l'], 'Should explode a string into an array of characters.');
  });

  test('fromQuery', function() {
    var query = 'foo%5Bbar%5D%5Bbaz%5D%5Bblargl%5D=blah&foo%5Bbar%5D%5Bbaz%5D%5Bblargr%5D=woop&blar=bluh&abc[]=123&abc[]=234';
    ok(_.isEqual(_.fromQuery(query), {
      'foo': {
        'bar': {
          'baz': {
            'blargl': 'blah',
            'blargr': 'woop'
          }
        }
      },
      'blar': 'bluh',
      'abc': [
        '123',
        '234'
      ]
    }), 'can convert a query string to a hash');
  });

  test('implode', function() {
    equal(_.implode(['H','o','m','e','r']), 'Homer', 'Should implode an array of characters into a single string.');
  });

  test('camelCase', function() {
    equal(_.camelCase('punic-wars'), 'punicWars', 'Should convert a dashed-format string to camelCase.');
  });

  test('toDash', function() {
    equal(_.toDash('trojanWar'), 'trojan-war', 'Should convert a camelCase string to dashed-format.');
    equal(_.toDash('PersianWar'), 'persian-war', 'Should convert a PascalCase string to dashed-format.');
  });

  test('toQuery', function() {
    var obj = {'foo&bar': 'baz', 'test': 'total success', 'nested': {'works': 'too'}, 'isn\'t': ['that', 'cool?']};
    equal(_.toQuery(obj), 'foo%26bar=baz&test=total+success&nested%5Bworks%5D=too&isn\'t%5B%5D=that&isn\'t%5B%5D=cool%3F', 'can convert a hash to a query string');
    equal(_.toQuery(obj), jQuery.param(obj), 'query serialization matchs jQuery.param()');
  });

  test('strContains', function() {
    equal(_.strContains('Metaphysics', 'physics'), true, 'Should return true if string contains search string.');
    equal(_.strContains('Poetics', 'prose'), false, 'Should return false if string does not contain search string.');

    var thrower = function() { _.strContains([], ''); };
    throws(thrower, TypeError, 'Throws TypeError if first argument is not a string.');
  });
});
