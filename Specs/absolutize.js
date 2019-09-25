
    function absolutize(url) {
        var a = document.createElement('a');
        a.href = url;
        a.href = a.href; // IE only absolutizes href on get, not set
        return a.href;
    }
export default absolutize;
