import { FeatureDetection } from '../../Source/Cesium.js';
import { TaskProcessor } from '../../Source/Cesium.js';
import absolutize from '../absolutize.js';
import { when } from '../../Source/Cesium.js';

describe('Core/TaskProcessor', function() {

    var taskProcessor;

    beforeEach(function() {
        TaskProcessor._workerModulePrefix = absolutize('../Specs/TestWorkers/');
    });

    afterEach(function() {
        TaskProcessor._workerModulePrefix = TaskProcessor._defaultWorkerModulePrefix;

        if (taskProcessor && !taskProcessor.isDestroyed()) {
            taskProcessor = taskProcessor.destroy();
        }
    });

    it('works with a simple worker', function() {
        taskProcessor = new TaskProcessor('returnParameters.js');

        var parameters = {
            prop : 'blah',
            obj : {
                val : true
            }
        };

        return taskProcessor.scheduleTask(parameters).then(function(result) {
            expect(result).toEqual(parameters);
        });
    });

    it('can be destroyed', function() {
        taskProcessor = new TaskProcessor('returnParameters.js');

        expect(taskProcessor.isDestroyed()).toEqual(false);

        taskProcessor.destroy();

        expect(taskProcessor.isDestroyed()).toEqual(true);
    });

    it('can transfer array buffer', function() {
        taskProcessor = new TaskProcessor('returnByteLength.js');

        var byteLength = 100;
        var parameters = new ArrayBuffer(byteLength);
        expect(parameters.byteLength).toEqual(byteLength);

        return when(TaskProcessor._canTransferArrayBuffer, function(canTransferArrayBuffer) {
            var promise = taskProcessor.scheduleTask(parameters, [parameters]);

            if (canTransferArrayBuffer) {
                // array buffer should be neutered when transferred
                expect(parameters.byteLength).toEqual(0);
            }

            // the worker should see the array with proper byte length
            return promise.then(function(result) {
                expect(result).toEqual(byteLength);
            });
        });
    });

    it('can transfer array buffer back from worker', function() {
        taskProcessor = new TaskProcessor('transferArrayBuffer.js');

        var byteLength = 100;
        var parameters = {
            byteLength : byteLength
        };

        // the worker should see the array with proper byte length
        return taskProcessor.scheduleTask(parameters).then(function(result) {
            expect(result.byteLength).toEqual(100);
        });
    });

    it('rejects promise if worker throws', function() {
        taskProcessor = new TaskProcessor('throwError.js');

        var message = 'foo';
        var parameters = {
            message : message
        };

        return taskProcessor.scheduleTask(parameters).then(function() {
            fail('should not be called');
        }).otherwise(function(error) {
            expect(error.message).toEqual(message);
        });
    });

    it('rejects promise if worker returns a non-clonable result', function() {
        taskProcessor = new TaskProcessor('returnNonCloneable.js');

        var message = 'foo';
        var parameters = {
            message : message
        };

        return taskProcessor.scheduleTask(parameters).then(function() {
            fail('should not be called');
        }).otherwise(function(error) {
            expect(error).toContain('postMessage failed');
        });
    });

    it('successful task raises the taskCompletedEvent', function() {
        taskProcessor = new TaskProcessor('returnParameters.js');

        var parameters = {
            prop : 'blah',
            obj : {
                val : true
            }
        };
        var eventRaised = false;
        var removeListenerCallback = TaskProcessor.taskCompletedEvent.addEventListener(function() {
            eventRaised = true;
        });

        return taskProcessor.scheduleTask(parameters).then(function(result) {
            expect(eventRaised).toBe(true);
        }).always(function () {
            removeListenerCallback();
        });
    });

    it('unsuccessful task raises the taskCompletedEvent with error', function() {
        taskProcessor = new TaskProcessor('returnNonCloneable.js');

        var message = 'foo';
        var parameters = {
            message : message
        };

        var eventRaised = false;
        var removeListenerCallback = TaskProcessor.taskCompletedEvent.addEventListener(function(error) {
            eventRaised = true;
            expect(error).toBeDefined();
        });

        return taskProcessor.scheduleTask(parameters).then(function() {
            fail('should not be called');
        }).otherwise(function(error) {
            expect(eventRaised).toBe(true);

        }).always(function () {
            removeListenerCallback();
        });
    });

    it('can load and compile web assembly module', function() {
        var binaryUrl = absolutize('../Specs/TestWorkers/TestWasm/testWasm.wasm');
        taskProcessor = new TaskProcessor('returnWasmConfig.js', 5);
        var promise = taskProcessor.initWebAssemblyModule({
            modulePath : 'TestWasm/testWasmWrapper',
            wasmBinaryFile : binaryUrl,
            fallbackModulePath : 'TestWasm/testWasmFallback'
        });

        return promise.then(function(result) {
            expect(result).toBeDefined();
            if (FeatureDetection.supportsWebAssembly()) {
                expect(result.modulePath).toMatch(/TestWasm\/testWasmWrapper/);
                expect(result.wasmBinary).toBeDefined();
            }
        });
    });

    it('uses a backup module if web assembly is not supported', function() {
        var binaryUrl = absolutize('../Specs/TestWorkers/TestWasm/testWasm.wasm');
        taskProcessor = new TaskProcessor('returnWasmConfig.js', 5);

        spyOn(FeatureDetection, 'supportsWebAssembly').and.returnValue(false);

        var promise = taskProcessor.initWebAssemblyModule({
            modulePath : 'TestWasm/testWasmWrapper',
            wasmBinaryFile : binaryUrl,
            fallbackModulePath : 'TestWasm/testWasmFallback'
        });

        return promise.then(function(result) {
            expect(result).toBeDefined();
            expect(result.modulePath).toMatch(/TestWasm\/testWasmFallback/);
            expect(result.wasmBinary).not.toBeDefined();
        });
    });

    it('throws runtime error if web assembly is not supported and no backup is provided', function() {
        var binaryUrl = absolutize('../Specs/TestWorkers/TestWasm/testWasm.wasm');
        taskProcessor = new TaskProcessor('returnWasmConfig.js', 5);

        spyOn(FeatureDetection, 'supportsWebAssembly').and.returnValue(false);

        expect(function () {
            taskProcessor.initWebAssemblyModule({
                modulePath : 'TestWasm/testWasmWrapper',
                wasmBinaryFile : binaryUrl
            });
        }).toThrowRuntimeError();
    });
});
