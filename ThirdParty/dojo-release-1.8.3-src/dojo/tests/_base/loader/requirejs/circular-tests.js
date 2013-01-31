require(
    ["require", "two", "funcTwo", "funcThree", "doh"],
    function(require, two, funcTwo, funcThree, doh){
        var args = two.doSomething();
        var twoInst = new funcTwo("TWO");
        doh.register(
            "circular",
            [
                function circular(t){
                    t.is("small", args.size);
                    t.is("redtwo", args.color);
                }
            ]
        );
        doh.run();

        doh.register(
            "circularFunc",
            [
                function circularFunc(t){
                    t.is("TWO", twoInst.name);
                    t.is("ONE-NESTED", twoInst.oneName());
                    t.is("THREE-THREE_SUFFIX", funcThree("THREE"));
                }
            ]
        );
        doh.run();
    }
);
