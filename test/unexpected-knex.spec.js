const Knex = require('knex');
const QueryBuilder = require('knex/lib/query/builder');
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
    const knex = Knex({
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

    describe('<knex> to have table <string>', function () {
        it('fulfils if the table exists', function () {
            return knex.schema.createTable('foo', table => {
                table.timestamps();
            })
            .then(() => expect(
                expect(knex, 'to have table', 'foo'),
                'to be fulfilled'
            ))
            .then(() => knex.schema.dropTable('foo'));
        });

        it('rejects if the table does not exist', function () {
            return expect(
                expect(knex, 'to have table', 'foo'),
                'to be rejected with',
                dontIndent`
                expected
                ${knexOutputBlock}
                to have table 'foo'`
            );
        });
    });

    describe('<knex> not to have table <string>', function () {
        it('fulfils if the table does not exist', function () {
            return expect(
                expect(knex, 'not to have table', 'foo'),
                'to be fulfilled'
            );
        });

        it('rejects if the table exists', function () {
            return knex.schema.createTable('foo', table => {
                table.timestamps();
            })
            .then(() => expect(
                expect(knex, 'not to have table', 'foo'),
                'to be rejected with',
                dontIndent`
                expected
                ${knexOutputBlock}
                not to have table 'foo'`
            ))
            .then(() => knex.schema.dropTable('foo'));
        });
    });

    describe('<knex> to have column <object>', function () {
        it('fulfils if the column exists', function () {
            return knex.schema.createTable('foo', table => {
                table.string('bar');
            })
            .then(() => expect(
                expect(knex, 'to have column', { foo: 'bar' }),
                'to be fulfilled'
            ))
            .then(() => knex.schema.dropTable('foo'));
        });

        it('rejects if the column does not exist', function () {
            return knex.schema.createTable('foo', table => {
                table.string('bar');
            })
            .then(() => expect(
                expect(knex, 'to have column', { foo: 'baz' }),
                'to be rejected with',
                dontIndent`
                expected
                ${knexOutputBlock}
                to have column { foo: 'baz' }`
            ))
            .then(() => knex.schema.dropTable('foo'));
        });

        it('rejects if the table itself does not exist', function () {
            return expect(
                expect(knex, 'to have column', { foo: 'bar' }),
                'to be rejected with',
                dontIndent`
                expected
                ${knexOutputBlock}
                to have column { foo: 'bar' }`
            );
        });

        it('throws if the object has more than one key', function () {
            return expect(
                () => expect(knex, 'to have column', { foo: 'bar', bar: 'baz' }),
                'to error with',
                dontIndent`
                expected
                ${knexOutputBlock}
                to have column { foo: 'bar', bar: 'baz' }
                  Provide a single column in the form: { tableName: columnName }`
            );
        });
    });

    describe('<knex> not to have column <object>', function () {
        it('fulfils if the column does not exist', function () {
            return knex.schema.createTable('foo', table => {
                table.string('bar');
            })
            .then(() => expect(
                expect(knex, 'not to have column', { foo: 'baz' }),
                'to be fulfilled'
            ))
            .then(() => knex.schema.dropTable('foo'));
        });

        it('rejects if the column exists', function () {
            return knex.schema.createTable('foo', table => {
                table.string('bar');
            })
            .then(() => expect(
                expect(knex, 'not to have column', { foo: 'bar' }),
                'to be rejected with',
                dontIndent`
                expected
                ${knexOutputBlock}
                not to have column { foo: 'bar' }`
            ))
            .then(() => knex.schema.dropTable('foo'));
        });

        it('fulfils if the table itself does not exist', function () {
            return expect(
                expect(knex, 'not to have column', { foo: 'bar' }),
                'to be fulfilled'
            );
        });

        it('throws if the object has more than one key', function () {
            return expect(
                () => expect(knex, 'not to have column', { foo: 'bar', bar: 'baz' }),
                'to error with',
                dontIndent`
                expected
                ${knexOutputBlock}
                not to have column { foo: 'bar', bar: 'baz' }
                  Provide a single column in the form: { tableName: columnName }`
            );
        });
    });

    describe('<knex> not to have column <object>', function () {
        it('fulfils if the column does not exist', function () {
            return knex.schema.createTable('foo', table => {
                table.string('bar');
            })
            .then(() => expect(
                expect(knex, 'not to have column', { foo: 'baz' }),
                'to be fulfilled'
            ))
            .then(() => knex.schema.dropTable('foo'));
        });

        it('rejects if the column exists', function () {
            return knex.schema.createTable('foo', table => {
                table.string('bar');
            })
            .then(() => expect(
                expect(knex, 'not to have column', { foo: 'bar' }),
                'to be rejected with',
                dontIndent`
                expected
                ${knexOutputBlock}
                not to have column { foo: 'bar' }`
            ))
            .then(() => knex.schema.dropTable('foo'));
        });

        it('fulfils if the table itself does not exist', function () {
            return expect(
                expect(knex, 'not to have column', { foo: 'bar' }),
                'to be fulfilled'
            );
        });

        it('throws if the object has more than one key', function () {
            return expect(
                () => expect(knex, 'not to have column', { foo: 'bar', bar: 'baz' }),
                'to error with',
                dontIndent`
                expected
                ${knexOutputBlock}
                not to have column { foo: 'bar', bar: 'baz' }
                  Provide a single column in the form: { tableName: columnName }`
            );
        });
    });

    describe('<knex> to have columns <object>', function () {
        it('fulfils if all the columns exist', function () {
            return knex.schema.createTable('foo', table => {
                table.string('bar');
                table.string('baz');
            })
            .then(() => expect(
                expect(knex, 'to have columns', { foo: [ 'bar', 'baz' ] }),
                'to be fulfilled'
            ))
            .then(() => knex.schema.dropTable('foo'));
        });

        it('rejects if any of the columns does not exist', function () {
            return knex.schema.createTable('foo', table => {
                table.string('bar');
            })
            .then(() => expect(
                expect(knex, 'to have columns', { foo: [ 'bar', 'baz' ] }),
                'to be rejected with',
                dontIndent`
                expected
                ${knexOutputBlock}
                to have columns { foo: [ 'bar', 'baz' ] }
                  expected knex to have column { foo: 'baz' }`
            ))
            .then(() => knex.schema.dropTable('foo'));
        });

        it('rejects if all columns do not exist', function () {
            return knex.schema.createTable('foo', table => {
                table.string('bar');
            })
            .then(() => expect(
                expect(knex, 'to have columns', { foo: [ 'baz', 'quux' ] }),
                'to be rejected with',
                dontIndent`
                expected
                ${knexOutputBlock}
                to have columns { foo: [ 'baz', 'quux' ] }
                  expected knex to have column { foo: 'baz' }`
            ))
            .then(() => knex.schema.dropTable('foo'));
        });

        it('rejects if the table itself does not exist', function () {
            return expect(
                expect(knex, 'to have columns', { foo: [ 'baz', 'quux' ] }),
                'to be rejected with',
                dontIndent`
                expected
                ${knexOutputBlock}
                to have columns { foo: [ 'baz', 'quux' ] }
                  expected knex to have column { foo: 'baz' }`
            );
        });

        it('fulfils if all the columns in all the tables exist', function () {
            return knex.schema.createTable('foo', table => {
                table.string('bar');
                table.string('baz');
            })
            .then(() => knex.schema.createTable('bar', table => {
                table.string('baz');
            }))
            .then(() => expect(
                expect(knex, 'to have columns', { foo: [ 'bar', 'baz' ], bar: 'baz' }),
                'to be fulfilled'
            ))
            .then(() => knex.schema.dropTable('foo'))
            .then(() => knex.schema.dropTable('bar'));
        });

        it('rejects if any of the columns in any of the tables does not exist', function () {
            return knex.schema.createTable('foo', table => {
                table.string('bar');
            })
            .then(() => knex.schema.createTable('bar', table => {
                table.string('baz');
            }))
            .then(() => expect(
                expect(knex, 'to have columns', { foo: [ 'bar', 'baz' ], bar: 'baz' }),
                'to be rejected with',
                dontIndent`
                expected
                ${knexOutputBlock}
                to have columns { foo: [ 'bar', 'baz' ], bar: 'baz' }
                  expected knex to have column { foo: 'baz' }`
            ))
            .then(() => knex.schema.dropTable('foo'))
            .then(() => knex.schema.dropTable('bar'));
        });

        it('rejects if all columns in all of the tables do not exist', function () {
            return knex.schema.createTable('foo', table => {
                table.string('bar');
            })
            .then(() => knex.schema.createTable('bar', table => {
                table.string('baz');
            }))
            .then(() => expect(
                expect(knex, 'to have columns', { foo: 'quux', bar: 'quux' }),
                'to be rejected with',
                dontIndent`
                expected
                ${knexOutputBlock}
                to have columns { foo: 'quux', bar: 'quux' }
                  expected knex to have column { foo: 'quux' }`
            ))
            .then(() => knex.schema.dropTable('foo'))
            .then(() => knex.schema.dropTable('bar'));
        });

        it('rejects if one of the tables do not exist', function () {
            return knex.schema.createTable('foo', table => {
                table.string('bar');
            })
            .then(() => expect(
                expect(knex, 'to have columns', { foo: 'bar', bar: 'quux' }),
                'to be rejected with',
                dontIndent`
                expected
                ${knexOutputBlock}
                to have columns { foo: 'bar', bar: 'quux' }
                  expected knex to have column { bar: 'quux' }`
            ))
            .then(() => knex.schema.dropTable('foo'));
        });

        it('rejects if the tables themselves do not exist', function () {
            return expect(
                expect(knex, 'to have columns', { foo: 'bar', bar: 'quux' }),
                'to be rejected with',
                dontIndent`
                expected
                ${knexOutputBlock}
                to have columns { foo: 'bar', bar: 'quux' }
                  expected knex to have column { foo: 'bar' }`
            );
        });
    });

    describe('<knex> not to have columns <object>', function () {
        it('fulfils if all the columns do not exist', function () {
            return knex.schema.createTable('foo', table => {
                table.string('bar');
                table.string('baz');
            })
            .then(() => expect(
                expect(knex, 'not to have columns', { foo: [ 'quux1', 'quux2' ] }),
                'to be fulfilled'
            ))
            .then(() => knex.schema.dropTable('foo'));
        });

        it('rejects if any of the columns exists', function () {
            return knex.schema.createTable('foo', table => {
                table.string('bar');
            })
            .then(() => expect(
                expect(knex, 'not to have columns', { foo: [ 'bar', 'baz' ] }),
                'to be rejected with',
                dontIndent`
                expected
                ${knexOutputBlock}
                not to have columns { foo: [ 'bar', 'baz' ] }
                  expected knex not to have column { foo: 'bar' }`
            ))
            .then(() => knex.schema.dropTable('foo'));
        });

        it('rejects if all columns exist', function () {
            return knex.schema.createTable('foo', table => {
                table.string('bar');
                table.string('baz');
            })
            .then(() => expect(
                expect(knex, 'not to have columns', { foo: [ 'bar', 'baz' ] }),
                'to be rejected with',
                dontIndent`
                expected
                ${knexOutputBlock}
                not to have columns { foo: [ 'bar', 'baz' ] }
                  expected knex not to have column { foo: 'bar' }`
            ))
            .then(() => knex.schema.dropTable('foo'));
        });

        it('fulfils if the table itself does not exist', function () {
            return expect(
                expect(knex, 'not to have columns', { foo: [ 'baz', 'quux' ] }),
                'to be fulfilled'
            );
        });

        it('fulfils if all the columns in all the tables do not exist', function () {
            return knex.schema.createTable('foo', table => {
                table.string('bar');
            })
            .then(() => knex.schema.createTable('bar', table => {
                table.string('baz');
            }))
            .then(() => expect(
                expect(knex, 'not to have columns', { foo: [ 'quux1', 'quux2' ], bar: 'quux1' }),
                'to be fulfilled'
            ))
            .then(() => knex.schema.dropTable('foo'))
            .then(() => knex.schema.dropTable('bar'));
        });

        it('rejects if any of the columns in any of the tables exists', function () {
            return knex.schema.createTable('foo', table => {
                table.string('bar');
            })
            .then(() => knex.schema.createTable('bar', table => {
                table.string('baz');
            }))
            .then(() => expect(
                expect(knex, 'not to have columns', { foo: [ 'baz', 'bar' ], bar: 'quux' }),
                'to be rejected with',
                dontIndent`
                expected
                ${knexOutputBlock}
                not to have columns { foo: [ 'baz', 'bar' ], bar: 'quux' }
                  expected knex not to have column { foo: 'bar' }`
            ))
            .then(() => knex.schema.dropTable('foo'))
            .then(() => knex.schema.dropTable('bar'));
        });

        it('rejects if all columns in all of the tables exists', function () {
            return knex.schema.createTable('foo', table => {
                table.string('bar');
            })
            .then(() => knex.schema.createTable('bar', table => {
                table.string('baz');
            }))
            .then(() => expect(
                expect(knex, 'not to have columns', { foo: 'bar', bar: 'baz' }),
                'to be rejected with',
                dontIndent`
                expected
                ${knexOutputBlock}
                not to have columns { foo: 'bar', bar: 'baz' }
                  expected knex not to have column { foo: 'bar' }`
            ))
            .then(() => knex.schema.dropTable('foo'))
            .then(() => knex.schema.dropTable('bar'));
        });

        it('fulfils if the tables themselves do not exist', function () {
            return expect(
                expect(knex, 'not to have columns', { foo: 'bar', bar: 'quux' }),
                'to be fulfilled'
            );
        });
    });

    describe('<knex> with table <string> <assertion?>', function () {
        it('passes a knex query to the next assertion', function () {
            return expect(knex, 'with table', 'foo', 'to be a', QueryBuilder);
        });

        it('populates the query with the table provided', function () {
            return expect(
                knex, 'with table', 'foo',
                'when passed as parameter to',
                query => query.toQuery(),
                'to be', `select * from "foo"`
            );
        });

        it('resolves with the query if no assertion is provided', function () {
            return expect(
                expect(knex, 'with table', 'foo'),
                'to be a', QueryBuilder
            ).and(
                'when passed as parameter to',
                query => query.toQuery(),
                'to be', `select * from "foo"`
            );
        });
    });

    describe('<knexQuery> to satisfy <array>', function () {
        it('runs query.select() and asserts the data returned against the array', function () {
            return knex.schema.createTable('foo', table => {
                table.string('bar');
            })
            .then(() => knex('foo').insert([
                { bar: 'foobar1' },
                { bar: 'foobar2' }
            ]))
            .then(() => expect(
                expect(knex('foo'), 'to satisfy', [
                    { bar: 'foobar1' },
                    { bar: 'foobar2' }
                ]),
                'to be fulfilled'
            ))
            .then(() => knex.schema.dropTable('foo'));
        });

        it(`works when there's only one record in the table`, function () {
            return knex.schema.createTable('foo', table => {
                table.string('bar');
            })
            .then(() => knex('foo').insert({ bar: 'foobar1' }))
            .then(() => expect(
                expect(knex('foo'), 'to satisfy', [
                    { bar: 'foobar1' }
                ]),
                'to be fulfilled'
            ))
            .then(() => knex.schema.dropTable('foo'));
        });

        it(`works when there's no data in the table`, function () {
            return knex.schema.createTable('foo', table => {
                table.string('bar');
            })
            .then(() => expect(
                expect(knex('foo'), 'to satisfy', []),
                'to be fulfilled'
            ))
            .then(() => knex.schema.dropTable('foo'));
        });

        it(`rejects with the correct error if the data doesn't match`, function () {
            return knex.schema.createTable('foo', table => {
                table.string('bar');
            })
            .then(() => knex('foo').insert([
                { bar: 'foobar1' },
                { bar: 'foobar2' }
            ]))
            .then(() => expect(
                expect(knex('foo'), 'to satisfy', [
                    { bar: 'foobar1' },
                    { bar: 'foobar20' }
                ]),
                'to be rejected with',
                dontIndent`
                expected 'select * from "foo"'
                to satisfy [ { bar: 'foobar1' }, { bar: 'foobar20' } ]

                [
                  { bar: 'foobar1' },
                  {
                    bar: 'foobar2' // should equal 'foobar20'
                                   //
                                   // -foobar2
                                   // +foobar20
                  }
                ]`
            ))
            .then(() => knex.schema.dropTable('foo'));
        });

        it('rejects with the correct error if the table is not empty but the array is', function () {
            return knex.schema.createTable('foo', table => {
                table.string('bar');
            })
            .then(() => knex('foo').insert([
                { bar: 'foobar1' },
                { bar: 'foobar2' }
            ]))
            .then(() => expect(
                expect(knex('foo'), 'to satisfy', []),
                'to be rejected with',
                dontIndent`
                expected 'select * from "foo"' to satisfy []

                [
                  { bar: 'foobar1' }, // should be removed
                  { bar: 'foobar2' } // should be removed
                ]`
            ))
            .then(() => knex.schema.dropTable('foo'));
        });
    });

    describe('<knexQuery> to satisfy <expect.it>', function () {
        it('runs query.select() and asserts the data returned against the assertion', function () {
            return knex.schema.createTable('foo', table => {
                table.string('bar');
            })
            .then(() => knex('foo').insert([
                { bar: 'foobar1' },
                { bar: 'foobar2' }
            ]))
            .then(() => expect(
                expect(knex('foo'), 'to satisfy', expect.it('to equal', [
                    { bar: 'foobar1' },
                    { bar: 'foobar2' }
                ])),
                'to be fulfilled'
            ))
            .then(() => knex.schema.dropTable('foo'));
        });

        it(`works when there's only one record in the table`, function () {
            return knex.schema.createTable('foo', table => {
                table.string('bar');
            })
            .then(() => knex('foo').insert({ bar: 'foobar1' }))
            .then(() => expect(
                expect(knex('foo'), 'to satisfy', expect.it('to equal', [
                    { bar: 'foobar1' }
                ])),
                'to be fulfilled'
            ))
            .then(() => knex.schema.dropTable('foo'));
        });

        it(`works when there's no data in the table`, function () {
            return knex.schema.createTable('foo', table => {
                table.string('bar');
            })
            .then(() => expect(
                expect(knex('foo'), 'to satisfy', expect.it('to equal', [])),
                'to be fulfilled'
            ))
            .then(() => knex.schema.dropTable('foo'));
        });

        it(`rejects with the correct error if the data doesn't match`, function () {
            return knex.schema.createTable('foo', table => {
                table.string('bar');
            })
            .then(() => knex('foo').insert([
                { bar: 'foobar1' },
                { bar: 'foobar2' }
            ]))
            .then(() => expect(
                expect(knex('foo'), 'to satisfy', expect.it('to equal', [
                    { bar: 'foobar1' },
                    { bar: 'foobar20' }
                ])),
                'to be rejected with',
                dontIndent`
                expected 'select * from "foo"'
                to satisfy expect.it('to equal', [ { bar: 'foobar1' }, { bar: 'foobar20' } ])

                expected [ { bar: 'foobar1' }, { bar: 'foobar2' } ]
                to equal [ { bar: 'foobar1' }, { bar: 'foobar20' } ]

                [
                  { bar: 'foobar1' },
                  {
                    bar: 'foobar2' // should equal 'foobar20'
                                   //
                                   // -foobar2
                                   // +foobar20
                  }
                ]`
            ))
            .then(() => knex.schema.dropTable('foo'));
        });

        it('rejects with the correct error if the table is not empty but the array is', function () {
            return knex.schema.createTable('foo', table => {
                table.string('bar');
            })
            .then(() => knex('foo').insert([
                { bar: 'foobar1' },
                { bar: 'foobar2' }
            ]))
            .then(() => expect(
                expect(knex('foo'), 'to satisfy', expect.it('to equal', [])),
                'to be rejected with',
                dontIndent`
                expected 'select * from "foo"' to satisfy expect.it('to equal', [])

                expected [ { bar: 'foobar1' }, { bar: 'foobar2' } ] to equal []

                [
                  { bar: 'foobar1' }, // should be removed
                  { bar: 'foobar2' } // should be removed
                ]`
            ))
            .then(() => knex.schema.dropTable('foo'));
        });
    });

    describe('<knex> to apply migration <string>', function () {
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
