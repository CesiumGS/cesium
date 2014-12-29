/*global defineSuite*/
defineSuite([
        'Core/TaskProcessor',
        'require',
        'ThirdParty/when'
    ], function(
        TaskProcessor,
        require,
        when) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var taskProcessor;

    beforeEach(function() {
        TaskProcessor._workerModulePrefix = '../Specs/TestWorkers/';

        function absolutize(url) {
            var a = document.createElement('a');
            a.href = url;
            a.href = a.href; // IE only absolutizes href on get, not set
            return a.href;
        }

        TaskProcessor._loaderConfig = {
            baseUrl : absolutize(require.toUrl('Specs/../Source'))
        };
    });

    afterEach(function() {
        TaskProcessor._workerModulePrefix = TaskProcessor._defaultWorkerModulePrefix;
        TaskProcessor._loaderConfig = undefined;

        if (taskProcessor && !taskProcessor.isDestroyed()) {
            taskProcessor = taskProcessor.destroy();
        }
    });

    it('works with a simple worker', function(done) {
        taskProcessor = new TaskProcessor('returnParameters');

        var parameters = {
            prop : 'blah',
            obj : {
                val : true
            }
        };

        taskProcessor.scheduleTask(parameters).then(function(result) {
            expect(result).toEqual(parameters);
            done();
        });
    });

    it('can be destroyed', function() {
        taskProcessor = new TaskProcessor('returnParameters');

        expect(taskProcessor.isDestroyed()).toEqual(false);

        taskProcessor.destroy();

        expect(taskProcessor.isDestroyed()).toEqual(true);
    });

    it('can transfer array buffer', function(done) {
        taskProcessor = new TaskProcessor('returnByteLength');

        var byteLength = 100;
        var parameters = new ArrayBuffer(byteLength);
        expect(parameters.byteLength).toEqual(byteLength);

        when(TaskProcessor._canTransferArrayBuffer, function(canTransferArrayBuffer) {
            var promise = taskProcessor.scheduleTask(parameters, [parameters]);

            if (canTransferArrayBuffer) {
                // array buffer should be neutered when transferred
                expect(parameters.byteLength).toEqual(0);
            }

            // the worker should see the array with proper byte length
            promise.then(function(result) {
                expect(result).toEqual(byteLength);
                done();
            });
        });
    });

    it('can transfer array buffer back from worker', function(done) {
        taskProcessor = new TaskProcessor('transferArrayBuffer');

        var byteLength = 100;
        var parameters = {
            byteLength : byteLength
        };

        // the worker should see the array with proper byte length
        taskProcessor.scheduleTask(parameters).then(function(result) {
            expect(result.byteLength).toEqual(100);
            done();
        });
    });

    it('rejects promise if worker throws', function(done) {
        taskProcessor = new TaskProcessor('throwError');

        var message = 'foo';
        var parameters = {
            message : message
        };

        taskProcessor.scheduleTask(parameters).then(function() {
            // Should not be called.
            expect(false).toBe(true);
        }).otherwise(function(error) {
            expect(error.message).toEqual(message);
            done();
        });
    });

    it('rejects promise if worker returns a non-clonable result', function() {
        taskProcessor = new TaskProcessor('returnNonCloneable');

        var message = 'foo';
        var parameters = {
            message : message
        };

        taskProcessor.scheduleTask(parameters).then(function() {
            // Should not be called.
            expect(false).toBe(true);
        }).otherwise(function(error) {
            expect(error).toContain('postMessage failed');
            done();
        });
    });
});