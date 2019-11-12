import when from '../ThirdParty/when.js';

    /**
     * @private
     */
    function loadAndExecuteScript(url) {
        var deferred = when.defer();
        var script = document.createElement('script');
        script.async = true;
        script.src = url;

        var head = document.getElementsByTagName('head')[0];
        script.onload = function() {
            script.onload = undefined;
            head.removeChild(script);
            deferred.resolve();
        };
        script.onerror = function(e) {
            deferred.reject(e);
        };

        head.appendChild(script);

        return deferred.promise;
    }
export default loadAndExecuteScript;
