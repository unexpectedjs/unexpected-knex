const knexFactory = require('knex');
const unexpected = require('unexpected');
const unexpectedFs = require('unexpected-fs');
const unexpectedRequire = require('unexpected-require');
const unexpectedKnex = require('../lib/unexpected-knex');

const expect = unexpected.clone()
    .use(unexpectedFs)
    .use(unexpectedRequire)
    .use(unexpectedKnex);

describe('unexpected-knex', function () {
    describe('<knex> to apply migration <migration>', function () {
        it('applies a migration', function () {
            const knex = knexFactory({
                client: 'sqlite3',
                connection: {
                    filename: ':memory:'
                },
                migrations: {
                    directory: '/path/to/migrations'
                },
                useNullAsDefault: true
            });

            const migration = {
                up: knex => knex.schema.createTable('foo', table => {
                    table.timestamps();
                }),
                down: knex => knex.schema.dropTable('foo'),
                name: '1-foo.js'
            };

            return expect(knex,
                'with fs mocked out', {
                    '/path/to/migrations': {
                        '1-foo.js': ''
                    }
                },
                'with require mocked out', {
                    '/path/to/migrations/1-foo.js': migration
                },
                'to apply migration', migration
            )
            .then(() => expect(knex, 'to have table', 'foo'))
            .then(() => knex.schema.dropTable('foo'));
        });
    });
});
