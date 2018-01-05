defineSuite([
    'Core/Resource'
], function(
    Resource) {
    'use strict';

    it('Relative URI is resolved correctly', function() {
        var resource = new Resource({
            url: 'model.gltf'
        });

        expect(resource.url).not.toEqual('model.gltf');
    });
});
