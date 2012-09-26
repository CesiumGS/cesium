/*global defineSuite*/
defineSuite([
         'DynamicScene/CzmlProcessor',
         'DynamicScene/SystemClockUpdater',
         'DynamicScene/EventSourceUpdater',
         'DynamicScene/TimeIntervalUpdater',
         'Core/JulianDate',
         'Core/Iso8601',
         'Core/TimeInterval',
         'Specs/createScene',
         'Specs/destroyScene',
         'Specs/MockProperty'
     ], function(
             CzmlProcessor,
             SystemClockUpdater,
             EventSourceUpdater,
             TimeIntervalUpdater,
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

    it('CzmlProcessor throws with empty argument.', function() {
        expect(function() {
           return new CzmlProcessor();
        }).toThrow();
    });

    it('adds czml to the czml processor and increments CompositeDynamicObjectCollection count', function(){
        var dm = new CzmlProcessor(scene);
        var json = [{"id":"e349b862-5ea3-48ca-b108-2fb4b95ae5c5","external":{"url":"http://localhost/test", "scope":"SHARED"}}];
        var docs = dm.getDocuments();
        expect(docs.length).toEqual(0);
        dm.add(json, "root");
        docs = dm.getDocuments();
        expect(docs.length).toEqual(1);
        expect(docs[0].name).toEqual('root');
        var obj = dm.getObject("e349b862-5ea3-48ca-b108-2fb4b95ae5c5", "root");
        expect(obj).toBeDefined();
    });

    it('adds czml to the czml processor without a name creates a unique doc name', function(){
        var dm = new CzmlProcessor(scene);
        var json = [{"id":"e349b862-5ea3-48ca-b108-2fb4b95ae5c5","external":{"url":"http://localhost/test", "scope":"SHARED"}}];
        var docs = dm.getDocuments();
        expect(docs.length).toEqual(0);
        dm.add(json);
        docs = dm.getDocuments();
        expect(docs.length).toEqual(1);
        expect(docs[0].name).toBeDefined();
    });

    it('removes without a compositeDynamicObjectCollection name causes exception', function(){
        var dm = new CzmlProcessor(scene);
        expect(function() {
            dm.remove();
        }).toThrow();
    });

    it('removes with a invalid compositeDynamicObjectCollection name does nothing', function(){
        var dm = new CzmlProcessor(scene);
        var json = [{"id":"e349b862-5ea3-48ca-b108-2fb4b95ae5c5","external":{"url":"http://localhost/test", "scope":"SHARED"}}];
        dm.add(json, "root");
        expect(dm.getDocuments().length).toEqual(1);
        expect(dm.getVisualizers().length).toEqual(1);
        dm.remove('toor');
        expect(dm.getDocuments().length).toEqual(1);
        expect(dm.getVisualizers().length).toEqual(1);
    });

    it('removes with a valid compositeDynamicObjectCollection name removes the compositeDynamicObjectCollection', function(){
        var dm = new CzmlProcessor(scene);
        var json = [{"id":"e349b862-5ea3-48ca-b108-2fb4b95ae5c5","external":{"url":"http://localhost/test", "scope":"SHARED"}}];
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
            expect(doc.name).toNotEqual('root');
        }
    });

    it('removeAll empties the collection', function(){
        var dm = new CzmlProcessor(scene);
        var json = [{"id":"e349b862-5ea3-48ca-b108-2fb4b95ae5c5","external":{"url":"http://localhost/test", "scope":"SHARED"}}];
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
        var dm = new CzmlProcessor(scene);
        expect(function(){
            dm.getObject();
        }).toThrow();
    });

    it('getObject without name argument throws exception', function(){
        var dm = new CzmlProcessor(scene);
        expect(function(){
            dm.getObject('id');
        }).toThrow();
    });

    it('getObject with valid id and name returns an object', function(){
        var dm = new CzmlProcessor(scene);
        var json = [{"id":"1","external":{"url":"http://localhost/test", "scope":"SHARED"}}];
        dm.add(json, "root");
        json = [{"id":"2","external":{"url":"http://localhost/test", "scope":"SHARED"}}];
        dm.add(json, "toot");
        json = [{"id":"3","external":{"url":"http://localhost/test", "scope":"SHARED"}}];
        dm.add(json, "soot");

        expect(dm.getObject("1", 'root')).toBeDefined();
    });

    it('getObject with invalid id returns undefined', function(){
        var dm = new CzmlProcessor(scene);
        var json = [{"id":"1","external":{"url":"http://localhost/test", "scope":"SHARED"}}];
        dm.add(json, "root");
        json = [{"id":"2","external":{"url":"http://localhost/test", "scope":"SHARED"}}];
        dm.add(json, "toot");
        json = [{"id":"3","external":{"url":"http://localhost/test", "scope":"SHARED"}}];
        dm.add(json, "soot");

        expect(dm.getObject("2", 'root')).toBeUndefined();
    });

    it('getObject with invalid name returns undefined', function(){
        var dm = new CzmlProcessor(scene);
        var json = [{"id":"1","external":{"url":"http://localhost/test", "scope":"SHARED"}}];
        dm.add(json, "root");
        json = [{"id":"2","external":{"url":"http://localhost/test", "scope":"SHARED"}}];
        dm.add(json, "toot");
        json = [{"id":"3","external":{"url":"http://localhost/test", "scope":"SHARED"}}];
        dm.add(json, "soot");

        expect(dm.getObject("1", 'toot')).toBeUndefined();
    });

    it('getObject with invalid id and name returns undefined', function(){
        var dm = new CzmlProcessor(scene);
        var json = [{"id":"1","external":{"url":"http://localhost/test", "scope":"SHARED"}}];
        dm.add(json, "root");
        json = [{"id":"2","external":{"url":"http://localhost/test", "scope":"SHARED"}}];
        dm.add(json, "toot");
        json = [{"id":"3","external":{"url":"http://localhost/test", "scope":"SHARED"}}];
        dm.add(json, "soot");

        expect(dm.getObject("1", 'bucky')).toBeUndefined();
    });

    it('update calls updater', function(){
        var fakeEventSource = jasmine.createSpyObj('EventSource', ['addEventListener', 'removeEventListener', 'close']);
        spyOn(window, 'EventSource').andReturn(fakeEventSource);

        var dm = new CzmlProcessor(scene);
        var json = [{"id":"1","external":{"url":"http://localhost/test", "scope":"SHARED"}}];
        dm.add(json, "root");
        json = [{"id":"2","external":{"url":"http://localhost/test", "scope":"SHARED"}}];
        dm.add(json, "toot");
        json = [{"id":"3","external":{"url":"http://localhost/test", "scope":"SHARED"}}];
        dm.add(json, "soot");
        var visualizers = dm.getVisualizers();
        spyOn(dm._updaters[0], 'update');
        spyOn(visualizers[0], 'update');

        dm.update(new JulianDate());
        expect(visualizers[0].update).toHaveBeenCalled();
        expect(dm._updaters[0].update).toHaveBeenCalled();
    });

    it('computeAvailability returns infinite with no data.', function() {
        var dm = new CzmlProcessor(scene);
        var json = [{"id":"1","external":{"url":"http://localhost/test", "scope":"SHARED"}}];
        dm.add(json, "root");
        var availability = dm.computeAvailability();
        expect(availability.start).toEqual(Iso8601.MINIMUM_VALUE);
        expect(availability.stop).toEqual(Iso8601.MAXIMUM_VALUE);
    });

    it('computeAvailability returns intersction of collections.', function() {
        var dm = new CzmlProcessor(scene);
        var json = [{"id":"1","external":{"url":"http://localhost/test", "scope":"SHARED"}, "availability" : "2012-08-01/2012-08-02"},{"id":"2","external":{"url":"http://localhost/test", "scope":"SHARED"}, "availability" : "2012-08-05/2012-08-06"}];
        dm.add(json, "root");

        var availability = dm.computeAvailability();
        expect(availability.start).toEqual(JulianDate.fromIso8601('2012-08-01'));
        expect(availability.stop).toEqual(JulianDate.fromIso8601('2012-08-06'));
    });

    it('czml has refreshInterval uses SystemClockUpdater.', function() {
        var dm = new CzmlProcessor(scene);
        var json = [{"id":"1","external":{"url":"http://localhost/test", "scope":"SHARED", "sourceType":"json", "pollingUpdate":{"refreshInterval": "30"}}}];

        dm.add(json, "root");
        var dc = dm.getDocuments()[0];
        expect(dc._collections[1]).toBeDefined();
        expect(dm._updaters[0]._updater instanceof SystemClockUpdater).toBeTruthy();
    });

    it('czml uses event source and adds to existing compositeDynamicObjectCollection.', function() {
        var dm = new CzmlProcessor(scene);
        var json = [{"id":"1","external":{"url":"http://localhost/test",  "sourceType":"eventstream", "eventname":"access", "scope":"SHARED"}}];

        dm.add(json, "root");
        expect(dm.getDocuments().length).toEqual(1);
        var dc = dm.getDocuments()[0];
        expect(dc._collections.length).toEqual(2);
    });

    it('czml uses event source and adds to new compositeDynamicObjectCollection.', function() {
        var dm = new CzmlProcessor(scene);
        var json = [{"id":"1","external":{"url":"http://localhost/test", "sourceType":"eventstream", "eventname":"access", "scope":"PRIVATE"}}];

        dm.add(json, "root");
        expect(dm.getDocuments().length).toEqual(2);
        var dc = dm.getDocuments()[0];
        expect(dc._collections.length).toEqual(1);
        expect(dm._updaters[0]._updater instanceof EventSourceUpdater).toBeTruthy();
    });

    it('czml uses timeIntervalUpdater and adds to new compositeDynamicObjectCollection.', function() {
        var dm = new CzmlProcessor(scene);
        var json = [{"id":"1","external":{"url":"http://localhost/test", "sourceType":"eventstream", "eventname":"access", "scope":"PRIVATE", "simulationDrivenUpdate":{"duration":"900"}}}];

        dm.add(json, "root");
        expect(dm.getDocuments().length).toEqual(2);
        var dc = dm.getDocuments()[0];
        expect(dc._collections.length).toEqual(1);
        expect(dm._updaters[0]._updater instanceof TimeIntervalUpdater).toBeTruthy();
    });

});