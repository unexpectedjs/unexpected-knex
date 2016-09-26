const knexFactory = require('knex');
const unexpected = require('unexpected');
const unexpectedFs = require('unexpected-fs');
const unexpectedRequire = require('unexpected-require');
const unexpectedKnex = require('../lib/unexpected-knex');
const dontIndent = require('dedent-js');

const expect = unexpected.clone()
    .use(unexpectedFs)
    .use(unexpectedRequire)
    .use(unexpectedKnex);

describe('unexpected-knex', function () {
    describe('<knex> to apply migration <string>', function () {
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
        const knexOutputBlock = dontIndent`
            knex({
              client: 'sqlite3',
              connection: { filename: ':memory:' },
              migrations: { directory: './migrations' },
              useNullAsDefault: true
            })`;

        it('applies a migration', function () {
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

        describe('throws a useful error', function () {
            it('if filename is an empty string', function () {
                return expect(() => expect(knex, 'to apply migration', ''),
                    'to error with',
                    dontIndent`
                    expected
                    ${knexOutputBlock}
                    to apply migration ''
                      the filename cannot be an empty string`
                );
            });

            it('if the migrations directory does not exist', function () {
                return expect(() =>
                    expect(knex,
                        'with fs mocked out', {},
                        'to apply migration', '1-foo.js'
                    ),
                    'to error with',
                    dontIndent`
                    expected
                    ${knexOutputBlock}
                    to apply migration '1-foo.js'
                      cannot load migration: Error({
                        message: 'Cannot find module \\'${migrationsDirectory}/1-foo.js\\'',
                        code: 'MODULE_NOT_FOUND'
                      })`
                );
            });

            it('if the migration file does not exist', function () {
                return expect(() =>
                    expect(knex,
                        'with fs mocked out', {
                            [migrationsDirectory]: {}
                        },
                        'to apply migration', '1-foo.js'
                    ),
                    'to error with',
                    dontIndent`
                    expected
                    ${knexOutputBlock}
                    to apply migration '1-foo.js'
                      cannot load migration: Error({
                        message: 'Cannot find module \\'${migrationsDirectory}/1-foo.js\\'',
                        code: 'MODULE_NOT_FOUND'
                      })`
                );
            });

            it(`if the migration cannot be require()'d`, function () {
                return expect(() =>
                    expect(knex,
                        'with fs mocked out', {
                            [migrationsDirectory]: {
                                '1-foo.js': ''
                            }
                        },
                        'with require mocked out', {
                            [migrationsDirectory]: {}
                        },
                        'to apply migration', '1-foo.js'
                    ),
                    'to error with',
                    dontIndent`
                    expected
                    ${knexOutputBlock}
                    to apply migration '1-foo.js'
                      cannot load migration: Error({
                        message: 'Cannot find module \\'${migrationsDirectory}/1-foo.js\\'',
                        code: 'MODULE_NOT_FOUND'
                      })`
                );
            });
        });
    });
});
