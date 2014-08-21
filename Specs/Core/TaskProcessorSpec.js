/*global defineSuite*/
defineSuite([
        'Core/TaskProcessor',
        'require',
        'Specs/waitsForPromise'
    ], function(
        TaskProcessor,
        require,
        waitsForPromise) {
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

    it('works with a simple worker', function() {
        taskProcessor = new TaskProcessor('returnParameters');

        var parameters = {
            prop : 'blah',
            obj : {
                val : true
            }
        };
        var promise = taskProcessor.scheduleTask(parameters);

        waitsForPromise(promise, function(result) {
            expect(result).toEqual(parameters);
        });
    });

    it('can be destroyed', function() {
        taskProcessor = new TaskProcessor('returnParameters');

        expect(taskProcessor.isDestroyed()).toEqual(false);

        taskProcessor.destroy();

        expect(taskProcessor.isDestroyed()).toEqual(true);
    });

    it('can transfer array buffer', function() {
        taskProcessor = new TaskProcessor('returnByteLength');

        var byteLength = 100;
        var parameters = new ArrayBuffer(byteLength);
        expect(parameters.byteLength).toEqual(byteLength);

        waitsForPromise(TaskProcessor._canTransferArrayBuffer, function(canTransferArrayBuffer) {
            var promise = taskProcessor.scheduleTask(parameters, [parameters]);

            if (canTransferArrayBuffer) {
                // array buffer should be neutered when transferred
                expect(parameters.byteLength).toEqual(0);
            }

            // the worker should see the array with proper byte length
            waitsForPromise(promise, function(result) {
                expect(result).toEqual(byteLength);
            });
        });
    });

    it('can transfer array buffer back from worker', function() {
        taskProcessor = new TaskProcessor('transferArrayBuffer');

        var byteLength = 100;
        var parameters = {
            byteLength : byteLength
        };

        var promise = taskProcessor.scheduleTask(parameters);

        // the worker should see the array with proper byte length
        waitsForPromise(promise, function(result) {
            expect(result.byteLength).toEqual(100);
        });
    });

    it('rejects promise if worker throws', function() {
        taskProcessor = new TaskProcessor('throwError');

        var message = 'foo';
        var parameters = {
            message : message
        };

        var promise = taskProcessor.scheduleTask(parameters);

        waitsForPromise.toReject(promise, function(error) {
            expect(error.message).toEqual(message);
        });
    });

    it('rejects promise if worker returns a non-clonable result', function() {
        taskProcessor = new TaskProcessor('returnNonCloneable');

        var message = 'foo';
        var parameters = {
            message : message
        };

        var promise = taskProcessor.scheduleTask(parameters);

        waitsForPromise.toReject(promise, function(error) {
            expect(error).toContain('postMessage failed');
        });
    });
});