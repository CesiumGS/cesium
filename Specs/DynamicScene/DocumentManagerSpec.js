/*global defineSuite*/
defineSuite([
         'DynamicScene/DocumentManager',
         'DynamicScene/SystemClockUpdater',
         'Core/JulianDate',
         'Core/Iso8601',
         'Core/TimeInterval',
         '../Specs/createScene',
         '../Specs/destroyScene',
         '../Specs/MockProperty'
     ], function(
             DocumentManager,
             SystemClockUpdater,
             JulianDate,
             Iso8601,
             TimeInterval,
             createScene,
             destroyScene,
             MockProperty) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var scene;

    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        destroyScene(scene);
    });

    afterEach(function() {
    });

    it('DocumentManager throws with empty argument.', function() {
        expect(function() {
           return new DocumentManager();
        }).toThrow();
    });

    it('adds a document to the document manager and increments document count', function(){
        var dm = new DocumentManager(scene);
        var json = [{"id":"e349b862-5ea3-48ca-b108-2fb4b95ae5c5","external":{"polling":"http://localhost/test", "scope":"SHARED"}}];
        var docs = dm.getDocuments();
        expect(docs.length).toEqual(0);
        dm.add(json, "root");
        docs = dm.getDocuments();
        expect(docs.length).toEqual(1);
        expect(docs[0].documentName).toEqual('root');
        var obj = dm.getObject("e349b862-5ea3-48ca-b108-2fb4b95ae5c5", "root");
        expect(obj).toBeDefined();
    });

    it('adds a document to the document manager without a documentName creates a unique doc name', function(){
        var dm = new DocumentManager(scene);
        var json = [{"id":"e349b862-5ea3-48ca-b108-2fb4b95ae5c5","external":{"polling":"http://localhost/test", "scope":"SHARED"}}];
        var docs = dm.getDocuments();
        expect(docs.length).toEqual(0);
        dm.add(json);
        docs = dm.getDocuments();
        expect(docs.length).toEqual(1);
        expect(docs[0].documentName).toBeDefined();
    });

    it('removes without a document name causes exception', function(){
        var dm = new DocumentManager(scene);
        expect(function() {
            dm.remove();
        }).toThrow();
    });

    it('removes with a invalid document name does nothing', function(){
        var dm = new DocumentManager(scene);
        var json = [{"id":"e349b862-5ea3-48ca-b108-2fb4b95ae5c5","external":{"polling":"http://localhost/test", "scope":"SHARED"}}];
        dm.add(json, "root");
        expect(dm.getDocuments().length).toEqual(1);
        expect(dm.getVisualizers().length).toEqual(1);
        dm.remove('toor');
        expect(dm.getDocuments().length).toEqual(1);
        expect(dm.getVisualizers().length).toEqual(1);
    });

    it('removes with a valid document name removes the document', function(){
        var dm = new DocumentManager(scene);
        var json = [{"id":"e349b862-5ea3-48ca-b108-2fb4b95ae5c5","external":{"polling":"http://localhost/test", "scope":"SHARED"}}];
        dm.add(json, "root");
        dm.add(json, "toot");
        dm.add(json, "soot");
        expect(dm.getDocuments().length).toEqual(3);
        expect(dm.getVisualizers().length).toEqual(3);
        dm.remove('root');
        expect(dm.getDocuments().length).toEqual(2);
        expect(dm.getVisualizers().length).toEqual(2);
        var docs = dm.getDocuments();
        var length = docs.length;
        for(var i = 0; i < length;++i){
            var doc = docs[i];
            expect(doc.documentName).toNotEqual('root');
        }
    });

    it('removeAll empties the collection', function(){
        var dm = new DocumentManager(scene);
        var json = [{"id":"e349b862-5ea3-48ca-b108-2fb4b95ae5c5","external":{"polling":"http://localhost/test", "scope":"SHARED"}}];
        dm.add(json, "root");
        dm.add(json, "toot");
        dm.add(json, "soot");
        expect(dm.getDocuments().length).toEqual(3);
        expect(dm.getVisualizers().length).toEqual(3);
        dm.removeAll();
        expect(dm.getDocuments().length).toEqual(0);
        expect(dm.getVisualizers().length).toEqual(0);
    });

    it('getObject with no arguments throws exception', function(){
        var dm = new DocumentManager(scene);
        expect(function(){
            dm.getObject();
        }).toThrow();
    });

    it('getObject without documentName argument throws exception', function(){
        var dm = new DocumentManager(scene);
        expect(function(){
            dm.getObject('id');
        }).toThrow();
    });

    it('getObject with valid id and name returns an object', function(){
        var dm = new DocumentManager(scene);
        var json = [{"id":"1","external":{"polling":"http://localhost/test", "scope":"SHARED"}}];
        dm.add(json, "root");
        json = [{"id":"2","external":{"polling":"http://localhost/test", "scope":"SHARED"}}];
        dm.add(json, "toot");
        json = [{"id":"3","external":{"polling":"http://localhost/test", "scope":"SHARED"}}];
        dm.add(json, "soot");

        expect(dm.getObject("1", 'root')).toBeDefined();
    });

    it('getObject with invalid id returns undefined', function(){
        var dm = new DocumentManager(scene);
        var json = [{"id":"1","external":{"polling":"http://localhost/test", "scope":"SHARED"}}];
        dm.add(json, "root");
        json = [{"id":"2","external":{"polling":"http://localhost/test", "scope":"SHARED"}}];
        dm.add(json, "toot");
        json = [{"id":"3","external":{"polling":"http://localhost/test", "scope":"SHARED"}}];
        dm.add(json, "soot");

        expect(dm.getObject("2", 'root')).toBeUndefined();
    });

    it('getObject with invalid documentName returns undefined', function(){
        var dm = new DocumentManager(scene);
        var json = [{"id":"1","external":{"polling":"http://localhost/test", "scope":"SHARED"}}];
        dm.add(json, "root");
        json = [{"id":"2","external":{"polling":"http://localhost/test", "scope":"SHARED"}}];
        dm.add(json, "toot");
        json = [{"id":"3","external":{"polling":"http://localhost/test", "scope":"SHARED"}}];
        dm.add(json, "soot");

        expect(dm.getObject("1", 'toot')).toBeUndefined();
    });

    it('getObject with invalid id and documentName returns undefined', function(){
        var dm = new DocumentManager(scene);
        var json = [{"id":"1","external":{"polling":"http://localhost/test", "scope":"SHARED"}}];
        dm.add(json, "root");
        json = [{"id":"2","external":{"polling":"http://localhost/test", "scope":"SHARED"}}];
        dm.add(json, "toot");
        json = [{"id":"3","external":{"polling":"http://localhost/test", "scope":"SHARED"}}];
        dm.add(json, "soot");

        expect(dm.getObject("1", 'bucky')).toBeUndefined();
    });

    it('update calls updateBuffer', function(){
        var eventSource = {
                test:function(){
                    this.onmessage({data:"{\"test\":\"value\"}"});
                }
        };
        spyOn(window, 'EventSource').andReturn(eventSource);
        var dm = new DocumentManager(scene);
        var json = [{"id":"1","external":{"polling":"http://localhost/test", "scope":"SHARED"}}];
        dm.add(json, "root");
        json = [{"id":"2","external":{"polling":"http://localhost/test", "scope":"SHARED"}}];
        dm.add(json, "toot");
        json = [{"id":"3","external":{"polling":"http://localhost/test", "scope":"SHARED"}}];
        dm.add(json, "soot");
        var docs = dm.getDocuments();
        var visualizers = dm.getVisualizers();
        spyOn(docs[0], 'updateBuffer');
        spyOn(visualizers[0], 'update');

        dm.update(new JulianDate());
        expect(docs[0].updateBuffer).toHaveBeenCalled();
        expect(visualizers[0].update).toHaveBeenCalled();
    });

    it('computeAvailability returns infinite with no data.', function() {
        var dm = new DocumentManager(scene);
        var json = [{"id":"1","external":{"polling":"http://localhost/test", "scope":"SHARED"}}];
        dm.add(json, "root");
        var availability = dm.computeAvailability();
        expect(availability.start).toEqual(Iso8601.MINIMUM_VALUE);
        expect(availability.stop).toEqual(Iso8601.MAXIMUM_VALUE);
    });

    it('computeAvailability returns intersction of collections.', function() {
        var dm = new DocumentManager(scene);
        var json = [{"id":"1","external":{"polling":"http://localhost/test", "scope":"SHARED"}, "availability" : "2012-08-01/2012-08-02"},{"id":"2","external":{"polling":"http://localhost/test", "scope":"SHARED"}, "availability" : "2012-08-05/2012-08-06"}];
        dm.add(json, "root");

        var availability = dm.computeAvailability();
        expect(availability.start).toEqual(JulianDate.fromIso8601('2012-08-01'));
        expect(availability.stop).toEqual(JulianDate.fromIso8601('2012-08-06'));
    });

    it('document has refreshInterval uses SystemClockUpdater.', function() {
        var dm = new DocumentManager(scene);
        var json = [{"id":"1","external":{"polling":"http://localhost/test", "scope":"SHARED", "refreshInterval": "30"}}];

        dm.add(json, "root");
        var dc = dm.getDocuments()[0];
        expect(dc._collections[1].updater).toBeDefined();
        expect(dc._collections[1].updater instanceof SystemClockUpdater).toBeTruthy();
    });

    it('document uses event source and adds to existing document.', function() {
        var dm = new DocumentManager(scene);
        var json = [{"id":"1","external":{"eventsource":"http://localhost/test",  "eventname":"access", "scope":"SHARED"}}];

        dm.add(json, "root");
        expect(dm.getDocuments().length).toEqual(1);
        var dc = dm.getDocuments()[0];
        expect(dc._collections.length).toEqual(2);
    });

    it('document uses event source and adds to new document.', function() {
        var dm = new DocumentManager(scene);
        var json = [{"id":"1","external":{"eventsource":"http://localhost/test", "eventname":"access", "scope":"PRIVATE"}}];

        dm.add(json, "root");
        expect(dm.getDocuments().length).toEqual(2);
        var dc = dm.getDocuments()[0];
        expect(dc._collections.length).toEqual(1);
    });

});