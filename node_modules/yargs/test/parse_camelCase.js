var should = require('chai').should(),
    yargs = require('../');

describe('parse', function () {

    describe('dashes and camelCase', function () {

        it('should provide options with dashes as camelCase properties', function () {
            var result = yargs()
                .parse([ '--some-option' ]);

            result.should.have.property('someOption').that.is.a('boolean').and.is.true;
        });

        it('should provide count options with dashes as camelCase properties', function () {
            var result = yargs()
                .option('some-option', {
                    describe : 'some option',
                    type     : 'count'
                })
                .parse([ '--some-option', '--some-option', '--some-option' ]);

            result.should.have.property('someOption', 3);
        });

        it('should provide options with dashes and aliases as camelCase properties', function () {
            var result = yargs()
                .option('some-option', {
                    alias    : 'o',
                    describe : 'some option'
                })
                .parse([ '--some-option' ]);

            result.should.have.property('someOption').that.is.a('boolean').and.is.true;
        });

        it('should provide defaults of options with dashes as camelCase properties', function() {
            var result = yargs()
                .option('some-option', {
                    describe : 'some option',
                    default  : 'asdf'
                })
                .parse([ ]);

            result.should.have.property('someOption', 'asdf');
        });

        it('should provide aliases of options with dashes as camelCase properties', function() {
            var result = yargs()
                .option('some-option', {
                    alias    : 'o',
                    describe : 'some option',
                    default  : 'asdf'
                })
                .parse([ ]);

            result.should.have.property('o', 'asdf');
        });

        it('should provide aliases of options with dashes as camelCase properties', function() {
            var result = yargs()
                .option('o', {
                    alias    : 'some-option',
                    describe : 'some option',
                    default  : 'asdf'
                })
                .parse([ ]);

            result.should.have.property('someOption', 'asdf');
        });

        it('should provide aliases with dashes as camelCase properties', function() {
            var result = yargs()
                .option('o', {
                    alias    : 'some-option',
                    describe : 'some option'
                })
                .parse([ '--some-option', 'val' ]);

            result.should.have.property('someOption').that.is.a('string').and.equals('val');
        });
    });

});
