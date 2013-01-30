require({
        baseUrl: "./"
    },
    ["require", "simple", "doh"],
    function(require, simple, doh){
        doh.register(
            "dataMain",
            [
                function dataMain(t){
                    t.is("blue", simple.color);
                }
            ]
        );
        doh.run();
    }
);
