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
    describe('<knex> to apply migration <string>', function () {
        it('applies a migration', function () {
            const knex = knexFactory({
                client: 'sqlite3',
                connection: {
                    filename: ':memory:'
                },
                migrations: {
                    directory: './migrations'
                },
                useNullAsDefault: true
            });
            // synonymous to './migrations' as specified in the knex config
            const migrationsDirectory = `${process.cwd()}/migrations`;

            return expect(knex,
                'with fs mocked out', {
                    [migrationsDirectory]: {
                        '1-foo.js': ''
                    }
                },
                'with require mocked out', {
                    [`${migrationsDirectory}/1-foo.js`]: {
                        up: knex => knex.schema.createTable('foo', table => {
                            table.timestamps();
                        }),
                        down: knex => knex.schema.dropTable('foo')
                    }
                },
                'to apply migration', '1-foo.js'
            )
            .then(() => expect(knex, 'to have table', 'foo'))
            .then(() => knex.schema.dropTable('foo'));
        });
    });
});
