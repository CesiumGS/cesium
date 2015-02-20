/*global defineSuite*/
defineSuite([
        'Core/sanitizeHtml',
        'Specs/waitsForPromise'
    ], function(
        sanitizeHtml,
        waitsForPromise) {
    "use strict";
    /*global it,expect*/

    it('allows some HTML in description', function() {
        var safeString = '<p>This is a test.</p>';

        waitsForPromise(sanitizeHtml(safeString).then(function(value) {
            expect(value).toEqual(safeString);
        }));
    });

    it('removes script tags from HTML description by default', function() {
        var evilString = 'Testing. <script>console.error("Scripts are disallowed by default.");</script>';

        waitsForPromise(sanitizeHtml(evilString).then(function(safeString) {
            expect(safeString).toContain('Testing.');
            expect(safeString).not.toContain('script');
        }));
    });
});