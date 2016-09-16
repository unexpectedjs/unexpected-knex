var knex = require('knex');
var expect = require('unexpected').clone().use(require('unexpected-fs'));
var unexpectedKnex = require('../lib/unexpected-knex');

describe('unexpected-knex', function () {
    it('throws if not provided a config object', function () {
        return expect(
            function () {
                unexpectedKnex();
            },
            'to error with',
            'Provide a config ({ knex, migrationsDir }) object'
        );
    });

    it('throws if not provided a knex instance in the config', function () {
        return expect(
            function () {
                unexpectedKnex({});
            },
            'to error with',
            'Provide a knex instance (config.knex)'
        );
    });

    it('throws if provided a non-valid knex instance in the config', function () {
        return expect(
            function () {
                unexpectedKnex({
                    knex: function () {}
                });
            },
            'to error with',
            'Provide a valid knex instance'
        );
    });

    it('throws if not provided a path to the migrations directory', function () {
        return expect(
            function () {
                unexpectedKnex({
                    knex: knex({})
                });
            },
            'to error with',
            'Provide a path to the migrations directory (config.migrationsDir)'
        );
    });

    it('throws if the path to the migrations directory is falsy', function () {
        return expect(
            function () {
                unexpectedKnex({
                    knex: knex({}),
                    migrationsDir: ''
                });
            },
            'to error with',
            'Provide a path to the migrations directory (config.migrationsDir)'
        );
    });

    it('throws if the path to the migrations directory is not a string', function () {
        return expect(
            function () {
                unexpectedKnex({
                    knex: knex({}),
                    migrationsDir: true
                });
            },
            'to error with',
            'Provide a valid path to the migrations directory'
        );
    });

    it('throws if the path to the migrations directory is does not exist', function () {
        return expect(
            function () {
                unexpectedKnex({
                    knex: knex({}),
                    migrationsDir: '/non/existent'
                });
            },
            'with fs mocked out', {},
            'to error with',
            'ENOENT: no such file or directory, stat \'/non/existent\''
        );
    });

    it('throws if the path to the migrations directory is not a directory', function () {
        return expect(
            function () {
                unexpectedKnex({
                    knex: knex({}),
                    migrationsDir: '/path/to/file'
                });
            },
            'with fs mocked out', {
                '/path/to': {
                    '/file': {
                        _isFile: true,
                        content: 'foo'
                    }
                }
            },
            'to error with',
            'Provide a valid path to the migrations directory'
        );
    });
});
