(function() {
    "use strict";
    /*global Cesium, describe, it, expect*/

    describe("createGuidSpec", function() {
        it("creates GUIDs", function() {
            var isGuidRegex = /^(\{){0,1}[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}(\}){0,1}$/;

            //Create three GUIDs
            var guid1 = Cesium.createGuid();
            var guid2 = Cesium.createGuid();
            var guid3 = Cesium.createGuid();

            //Make sure they are all unique
            expect(guid1).toNotEqual(guid2);
            expect(guid1).toNotEqual(guid3);
            expect(guid2).toNotEqual(guid3);

            //Make sure they are all properly formatted
            expect(isGuidRegex.test(guid1)).toBeTruthy();
            expect(guid1.length).toEqual(36);

            expect(isGuidRegex.test(guid2)).toBeTruthy();
            expect(guid2.length).toEqual(36);

            expect(isGuidRegex.test(guid3)).toBeTruthy();
            expect(guid3.length).toEqual(36);
        });
    });
}());