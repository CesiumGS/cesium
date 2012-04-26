(function() {
    var docSet = testhelpers.getDocSetFromFile('test/cases/memberoftagforced.js'),
        maproutes = docSet.getByLongname('map.routes')[0],
        datapointy = docSet.getByLongname('Data#point.y')[0];
    
    test('A nested symbol with a @memberof! tag set to <global>.', function() {
        assert.equal(maproutes.name, 'map.routes', 'Has a shortname that includes the nested names.');
    });
    
    test('A nested symbol with a @memberof! tag set to another symbol.', function() {
        assert.equal(datapointy.name, 'point.y', 'Has a shortname that includes the nested names.');
    });
})();