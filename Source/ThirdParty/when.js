var when = function(promiseOrValue, onFulfilled, onRejected) {
    return new Promise(function(resolve) {
        resolve(promiseOrValue);
    }).then(function(result) {
        if (onFulfilled) {
            return onFulfilled(result);
        }
        return result;
    }).catch(function(e) {
        if (onRejected) {
            return onRejected(e);
        }
    });
}

when.defer = function() {
    var deferred = {};
    deferred.promise = new Promise(function(resolve, reject) {
        deferred.resolve = resolve;
        deferred.reject = reject;
    });

    return deferred;
}

export default when;
