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
            'Please provide a config ({ knex, migrationsDir }) object'
        );
    });

    it('throws if not provided a knex instance in the config', function () {
        return expect(
            function () {
                unexpectedKnex({});
            },
            'to error with',
            'Please provide a knex instance (config.knex)'
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
            'Please provide a valid knex instance'
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
            'Please provide a path to the migrations directory (config.migrationsDir)'
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
            'Please provide a path to the migrations directory (config.migrationsDir)'
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
            'Please provide a valid path to the migrations directory'
        );
    });

    it('throws if not the path to the migrations directory is does not exist', function () {
        return expect(
            function () {
                unexpectedKnex({
                    knex: knex({}),
                    migrationsDir: '/non/existent'
                });
            },
            'with fs mocked out', {},
            'to error with',
            'ENOENT: no such file or directory, scandir \'/non/existent\''
        );
    });

    it('gets migration files from the configured migrations directory', function () {
        return expect(
            function () {
                return expect(unexpectedKnex({
                    knex: knex({}),
                    migrationsDir: '/migrations'
                }), 'to satisfy', {
                    migrationFiles: expect.it('when sorted', 'to equal', [
                        'bar.js',
                        'foo.js'
                    ])
                });
            },
            'with fs mocked out', {
                '/migrations': {
                    'foo.js': 'foo',
                    'bar.js': 'bar'
                }
            },
            'not to error'
        );
    });
});
