const sqlite3 = require('sqlite3');
const knexModule = require('knex');
const unexpected = require('unexpected');
const unexpectedFs = require('unexpected-fs');
const unexpectedRequire = require('unexpected-require');
const unexpectedKnexFactory = require('../lib/unexpected-knex');

describe('unexpected-knex', function () {
    describe('on initialization', function () {
        const expect = unexpected.clone();

        it('throws if not provided a knex instance', function () {
            return expect(
                function () {
                    unexpectedKnexFactory();
                },
                'to error with',
                'No knex instance provided'
            );
        });

        it('throws if not provided a valid knex instance', function () {
            return expect(
                function () {
                    unexpectedKnexFactory(function () {});
                },
                'to error with',
                'Invalid knex instance provided'
            );
        });
    });

    describe('after initialization', function () {
        const db = new sqlite3.Database(':memory:');
        const knex = knexModule({
            client: 'sqlite3',
            connection: {
                filename: ':memory:'
            },
            migrations: {
                directory: '/path/to/migrations'
            }
        });
        const unexpectedKnex = unexpectedKnexFactory(knex);
        const expect = unexpected.clone()
            .use(unexpectedFs)
            .use(unexpectedRequire)
            .use(unexpectedKnex)
            .addType({
                name: 'unexpectedKnex',
                base: 'object',
                identify: function (value) {
                    return value &&
                        value.name === 'unexpected-knex' &&
                        typeof value.installInto === 'function';
                },
                inspect: function (value, depth, output, inspect) {
                    output.appendInspected('unexpected-knex');
                }
            })
            .addAssertion(
                '<unexpectedKnex> to apply migration <migration>',
                function (expect, unexpectedKnex, migration) {
                    expect.errorMode = 'nested';
                    const filename = migration.name;
                    return expect(
                        migration,
                        'with fs mocked out', {
                            '/path/to/migrations': {
                                [filename]: ''
                            }
                        },
                        'with require mocked out', {
                            [`/path/to/migrations/${filename}`]: migration
                        },
                        'to apply'
                    );
                }
            );

        after(function () {
            db.close();
        });

        describe('<migration> to apply', function () {
            it('applies a migration', function () {
                const migration = {
                    up: knex => knex.schema.createTable('foo', table => {
                        table.timestamps();
                    }),
                    down: knex => knex.schema.dropTable('foo'),
                    name: '1-foo.js'
                };
                return expect(unexpectedKnex, 'to apply migration', migration)
                    .then(() => expect(knex, 'to have table', 'foo'))
                    .then(() => knex.schema.dropTable('foo'));
            });
        });
    });
});
