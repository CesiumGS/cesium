/*global defineSuite*/
defineSuite([
        'Core/loadWithXhr',
        'Core/loadImage'
    ], function(
        loadWithXhr,
        loadImage) {
    'use strict';

    describe('data URI loading', function() {
        it('can load URI escaped text with default response type', function() {
            return loadWithXhr({
                url : 'data:,Hello%2C%20World!'
            }).then(function(result) {
                expect(result).toEqual('Hello, World!');
            });
        });

        it('can load URI escaped text with responseType=text', function() {
            return loadWithXhr({
                url : 'data:,Hello%2C%20World!',
                responseType : 'text'
            }).then(function(result) {
                expect(result).toEqual('Hello, World!');
            });
        });

        it('can load Base64 encoded text with default response type', function() {
            return loadWithXhr({
                url : 'data:text/plain;base64,SGVsbG8sIFdvcmxkIQ=='
            }).then(function(result) {
                expect(result).toEqual('Hello, World!');
            });
        });

        it ('can load Base64 encoded text with responseType=text', function() {
            return loadWithXhr({
                url : 'data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==',
                responseType : 'text'
            }).then(function(result) {
                expect(result).toEqual('Hello, World!');
            });
        });

        it('can load Base64 & URI encoded text with default responseType', function() {
            return loadWithXhr({
                url : 'data:text/plain;base64,SGVsbG8sIFdvcmxkIQ%3D%3D'
            }).then(function(result) {
                expect(result).toEqual('Hello, World!');
            });
        });

        it('can load Base64 & URI encoded text with responseType=text', function() {
            return loadWithXhr({
                url : 'data:text/plain;base64,SGVsbG8sIFdvcmxkIQ%3D%3D',
                responseType : 'text'
            }).then(function(result) {
                expect(result).toEqual('Hello, World!');
            });
        });

        it('can load URI escaped HTML as text with default responseType', function() {
            return loadWithXhr({
                url : 'data:text/html,%3Ch1%3EHello%2C%20World!%3C%2Fh1%3E'
            }).then(function(result) {
                expect(result).toEqual('<h1>Hello, World!</h1>');
            });
        });

        it('can load URI escaped HTML as text with responseType=text', function() {
            return loadWithXhr({
                url : 'data:text/html,%3Ch1%3EHello%2C%20World!%3C%2Fh1%3E',
                responseType : 'text'
            }).then(function(result) {
                expect(result).toEqual('<h1>Hello, World!</h1>');
            });
        });

        it('can load URI escaped text as JSON', function() {
            return loadWithXhr({
                url : 'data:application/json,%7B%22key%22%3A%22value%22%7D',
                responseType : 'json'
            }).then(function(result) {
                expect(result.key).toEqual('value');
            });
        });

        it('can load Base64 encoded text as JSON', function() {
            return loadWithXhr({
                url : 'data:application/json;base64,eyJrZXkiOiJ2YWx1ZSJ9',
                responseType : 'json'
            }).then(function(result) {
                expect(result.key).toEqual('value');
            });
        });

        it('can load URI escaped HTML as document', function() {
            return loadWithXhr({
                url : 'data:text/html,%3Ch1%3EHello%2C%20World!%3C%2Fh1%3E',
                responseType : 'document'
            }).then(function(result) {
                expect(result.querySelector('h1')).not.toBeNull();
            });
        });

        var tile = 'data:;base64,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DwABABIAAgAAAAIAEwACAAEABgADAAIAEwAAABMAFAACAAEAAgAAAAAAAgAEAAYAAwAEAAEACAACAAYACAAHAAAACQAAAAQAAgABAAoAAAAKAAAACwAOAAAABQAMAAMAAgAMAAEADwAQAAAAAgAQAAEAAAACABIAEgAUAAEAAAADAAIAAAAEAAIABAABAAUABQABAAYAAAAIAAcABwACAAEACAAAAAAAAwACAAoAAQAMAAoAAAAMAA0AAQANAAIAAAANAAAAAAASAA8AAwABAA8ADwAEAAIAEQASAAEAAAASAAAAEwACABUAAwABABMAAAAEAAYAAQACAAQAAAAAAAgACAABAAMABwACAAgAAgAHAAAAAQAIAAoACgAAAAIADAABAAsADQABAAwADQAOAAAAAgAOAAAAAQAPAAAAAwABABAAEgAAABIABAASAAEAEwAAAAIAFQABABQAAQAAAAMAAwAAAAcABAACAAEAAQAFAAcABQAAAAAABwAAAAkAAQAIAAIAAwAIAAAAAQAJAAUAAgAAAAsACwABAAAADAABAA4ADwAOAAEAAAASABAAAgABABAAAQARABIAAAASAAIAEgABAAAAFQATAAEAAAAEAAAABgAHAAUAAQAFAAcABQACAAQABwAAAAIACAAKAAEACgAAAAIAAQALAAAAAQAMAA0ADgABAA0AAAACAA8AAQAPAAAADQABABAAEQASAA0AEgABAA0AAQASAAAAAgABAAAAAQAEAAMAAAAFAAAAAAAHAAMAAQAIAAcAAgAHAAQACAAAAAoAAQAJAAAACgADAAEACwAAAA0ADAADAAAAAQACAA0ADwAOAAIAAgAQAA8AAgAAABEAEwARAAAAAQASAAIAAQAAABUAFAAVAAEAAQAAABUAFQABACkAAgAAAAAAAgAEAAUAAwAEAAAAAQAFAAIABwAAAAcABwABAAQAAAAAAAoAAwAKAAEACgAMAAIAAAANAAwADQABAAMAAAACAA0ADQAQAAEAAAAAAAQABgAEAAEAAwACAAQAAQAFAAYABQAAAAAABwADAAIABwAAAAoAAQAIAAIAAAAOAAsACwACAAEADQAOAAEAAAAAAA8ADwABAA4AAgAPAAAAAQAQAAQAAAATABAAEAADAAEAPAA7ABMAAQA8ABMAPAABAAAAAQACAAAAAwAFAAEABQAGAAAAAAAHAAIAAwAHAAEACAAAAAAACAACAAoAAQAEAAoACAAMAAAAAQADAAkADAANAAkADgABAA0ADwAAAA8AAgAPAAAAAQAQAAIAAAASAAAAEwAUAAEABAATAAIAFAAVAAEAAQAVAAAAAwACAAEAAQAAAAQAAQAGAAQAAAAHAAAACAACAAcAAQAIAAMAAAAKAAgACAADAAEADAAKAAEADAAAAAwAAgAAAA4AAgAOAAEAAAARAA4ADgADAAEAAAAAABMAAwACABMAEwABABIAAAAVABMAAQATAAIAAgAAAAAABAABAAMABQACAAQABgAIAAUAAAADAAYABgAJAAEAAAACAAoACQABAAoAAAAKAAAAAwALAAAAAQAMAAMAAgAMAA4ADgAQAAIAAAADABEAEQAQAAEAAAAAABIAFAACABIAAwASAAEAFAAVAAIAAgAAAAIAAwAWAAAAAAADAAUAAgABAAUAAAAFAAQABQABAAcAAAAKAAgACAACAAEACgABAAsACwABAAAACgAMAAEACgAAAAAAAQAPAAwAAwACAAwAAAAQAAIAEAABABEAAQATABEAAQAAAAAAAAAEAAIAAAAXAAUABQACAAEABAAFAAYABgAHAAQAAAAIAAkACQAAAAIACwABAAoACwAMAAEAAQAMAAAAEAABAA0AEAAOAAAAAgARAAEAAAAQABEAAQARAAAAAgABAAAAAgATAAAAAwAAAAMABAAAAAAABgAEAAIAAQADAAYABABCAAAAQwAFAAAABAAGAAIAAQAGABkABAAAAAQAVQAFAAMABQBVAAEAAAAHAAUABQACAAEABwABAAAAAgADAFoAAgAAAAIAAQADAFsAWwAEAFkAWQAEAFcABABYAFcAWAAGAEkABgBIAEkAMwBIAAUAHQAzAAUAWwBaAAEAAQBaAAAAAABcAF4AXAABAAIAAAACAGAAXwBgAAIAAAAAAAMAAgADAGIAYgB0AAIAAAACAAMAdQABAAMAAgABAAAAAgAAAAIAAwB3AHgAAQADAAAAAQAEAHkAAAADAAIAAwABAAAAewCPAAMAAwCPAAIAAAADAAAAkQCSAAQABAACAAMAAQAEAJIAAQAAAAMAkwCmAAIApgABAAIApgClAAEAIQAAACEAIQABAAAAAQA4ACIAAAACAAMAOQACADgAOAACAAAAAAACAAQABAADAAEAAwAAAAIAAAAEAAMAAwACAAEABAABAAAAPQAFAD8AAQAAAAYAQAAGAAEAAAAEAAAABAAFAAAABgAHAAIAAQAGAAMABwAAAAMAAQAEAAMAvQC+AAQABAABAL0ABAC+AAIAvgAGAAIAAAAGAAcAAQAHALsAuwAHAL8ABgABAAAABwBaAEYAWgAHAAEAAQACAAAAvgADAL0AAQADAL4AAgBcAFsAAQCZAAIAAgCZAFwArACZAAEAvgCsAAEAXACZAJgAwAAAAMMAwQAFAAAAAgDCAAEA2AACANYAxAACANgAEQAAAAEAnwCoANUA2QAFANoAzgDLAMkApwCmAKMAqgCsAK0AqwACAAAAAQAEABEAAAAEAK4ADAAkAMYAxQDIAMIAwQC/ALsAugC5ALIAsAC8AL0AAgAAAJ8ArgA=';

        it('can load Base64 encoded data as arraybuffer', function() {
            return loadWithXhr({
                url : tile,
                responseType : 'arraybuffer'
            }).then(function(result) {
                expect(result.byteLength).toEqual(3914);
            });
        });

        var image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAEISURBVEhLvVXBDYQwDOuojHKj8LhBbpTbpBCEkZsmIVTXq1RVQGrHiWlLmTTqPiZBlyLgy/KSZQ5JSHDQ/mCYCsC8106kDU0AdwRnvYZArWRcAl0dcYJq1hWCb3hBrumbDAVMwAC82WoRvgMnVMDBnB0nYZFTbE6BBvdUGqVqCbjBIk3PyFFR/NU7EKzru+qZsau3ryPwwCRLKYOzutZuCL6fUmWeJGzNzL/RxAMrUmASSCkkAayk2IxPlwhAAYGpsiHQjbLccfdOY5gKkCXAMi7SscAwbQpAnKyctWyUZ6z8ja3OGMepwD8asz+9FnSvbhU8uVOHFIwQsI3/p0CfhuqCSQuxLqsN6mu8SS+N42MAAAAASUVORK5CYII=';

        it('can load Base64 encoded data as blob', function() {
            return loadWithXhr({
                url : image,
                responseType : 'blob'
            }).then(function(result) {
                expect(result.type).toEqual('image/png');

                /*global URL*/
                var blobUrl = URL.createObjectURL(result);

                return loadImage(blobUrl).then(function(image) {
                    expect(image.width).toEqual(24);
                    expect(image.height).toEqual(24);
                });
            });
        });

        xit('can support 2xx HTTP status (other than 200)', function(){
            return loadWithXhr({
                method: 'POST',
                url: 'http://jsonplaceholder.typicode.com/posts',
                data: {
                    title: 'foo',
                    body: 'bar',
                    userId: 1
                }
            }).then(function(result){
                expect(JSON.parse(result).id).toEqual(101);
            });
        });
    });
});
