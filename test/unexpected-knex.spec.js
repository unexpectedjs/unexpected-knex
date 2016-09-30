const path = require('path');
const Knex = require('knex');
const QueryBuilder = require('knex/lib/query/builder');
const unexpected = require('unexpected');
const unexpectedFs = require('unexpected-fs');
const unexpectedRequire = require('unexpected-require');
const unexpectedKnex = require('../lib/unexpected-knex');
const dontIndent = require('dedent-js');


describe('unexpected-knex', function () {
    function createKnex() {
        return Knex({
            client: 'sqlite3',
            connection: {
                filename: ':memory:'
            },
            migrations: {
                directory: './migrations'
            },
            useNullAsDefault: true
        });
    }
    let knex = createKnex();
    // synonymous to './migrations' as specified in the knex config
    const migrationsDirectory = `${process.cwd()}/migrations`;
    const knexOutputBlock = dontIndent`
        knex({
          client: 'sqlite3',
          connection: { filename: ':memory:' },
          migrations: { directory: './migrations' },
          useNullAsDefault: true
        })`;
    const expect = unexpected.clone()
        .use(unexpectedFs)
        .use(unexpectedRequire)
        .use(unexpectedKnex)
        .addAssertion(
            '<any> with the migrations directory containing <object> <assertion>',
            function (expect, subject, migrations, ...rest) {
                expect.errorMode = 'bubble';
                const filenames = Object.keys(migrations);
                const fsContext = {
                    [migrationsDirectory]: filenames.reduce((context, filename) => {
                        // File content doesn't matter for the knex migrator, what
                        // matters is the require() context
                        context[filename] = '';
                        return context;
                    }, {})
                };
                const requireContext = filenames.reduce((context, filename) => {
                    const absolutePath = path.resolve(migrationsDirectory, filename);
                    context[absolutePath] = migrations[filename];
                    return context;
                }, {});
                return expect.apply(expect, [
                    subject,
                    'with fs mocked out', fsContext,
                    'with require mocked out', requireContext,
                    ...rest
                ]);
            }
        )
        .addAssertion(
            '<any> with no migrations directory <assertion>',
            function (expect, subject, ...rest) {
                expect.errorMode = 'bubble';
                return expect.apply(expect, [
                    subject,
                    'with fs mocked out', {},
                    ...rest
                ]);
            }
        )
        .addAssertion(
            '<any> with an empty migrations directory <assertion>',
            function (expect, subject, ...rest) {
                expect.errorMode = 'bubble';
                return expect.apply(expect, [
                    subject,
                    'with fs mocked out', {
                        [migrationsDirectory]: {}
                    },
                    ...rest
                ]);
            }
        );

    afterEach(function () {
        return knex.destroy().then(() => knex = createKnex());
    });

    describe('<knex> to have table <string>', function () {
        it('fulfils if the table exists', function () {
            return knex.schema.createTable('foo', table => {
                table.timestamps();
            })
            .then(() => expect(
                expect(knex, 'to have table', 'foo'),
                'to be fulfilled'
            ));
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
            ));
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
            ));
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
            ));
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
            ));
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
            ));
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
            ));
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
            ));
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
            ));
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
            ));
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
            ));
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
            ));
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
            ));
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
            ));
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
            ));
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
            ));
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
            ));
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
            ));
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
            ));
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
            ));
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
            ));
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

    describe('<knexQuery> to have rows satisfying <array>', function () {
        it('runs query.select() and asserts the data returned against the array', function () {
            return knex.schema.createTable('foo', table => {
                table.string('bar');
            })
            .then(() => knex('foo').insert([
                { bar: 'foobar1' },
                { bar: 'foobar2' }
            ]))
            .then(() => expect(
                expect(knex('foo'), 'to have rows satisfying', [
                    { bar: 'foobar1' },
                    { bar: 'foobar2' }
                ]),
                'to be fulfilled'
            ));
        });

        it(`works when there's only one record in the table`, function () {
            return knex.schema.createTable('foo', table => {
                table.string('bar');
            })
            .then(() => knex('foo').insert({ bar: 'foobar1' }))
            .then(() => expect(
                expect(knex('foo'), 'to have rows satisfying', [
                    { bar: 'foobar1' }
                ]),
                'to be fulfilled'
            ));
        });

        it(`works when there's no data in the table`, function () {
            return knex.schema.createTable('foo', table => {
                table.string('bar');
            })
            .then(() => expect(
                expect(knex('foo'), 'to have rows satisfying', []),
                'to be fulfilled'
            ));
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
                expect(knex('foo'), 'to have rows satisfying', [
                    { bar: 'foobar1' },
                    { bar: 'foobar20' }
                ]),
                'to be rejected with',
                dontIndent`
                expected 'select * from "foo"'
                to have rows satisfying [ { bar: 'foobar1' }, { bar: 'foobar20' } ]

                [
                  { bar: 'foobar1' },
                  {
                    bar: 'foobar2' // should equal 'foobar20'
                                   //
                                   // -foobar2
                                   // +foobar20
                  }
                ]`
            ));
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
                expect(knex('foo'), 'to have rows satisfying', []),
                'to be rejected with',
                dontIndent`
                expected 'select * from "foo"' to have rows satisfying []

                [
                  { bar: 'foobar1' }, // should be removed
                  { bar: 'foobar2' } // should be removed
                ]`
            ));
        });
    });

    describe('<knexQuery> to have rows satisfying <expect.it>', function () {
        it('runs query.select() and asserts the data returned against the assertion', function () {
            return knex.schema.createTable('foo', table => {
                table.string('bar');
            })
            .then(() => knex('foo').insert([
                { bar: 'foobar1' },
                { bar: 'foobar2' }
            ]))
            .then(() => expect(
                expect(knex('foo'), 'to have rows satisfying', expect.it('to equal', [
                    { bar: 'foobar1' },
                    { bar: 'foobar2' }
                ])),
                'to be fulfilled'
            ));
        });

        it(`works when there's only one record in the table`, function () {
            return knex.schema.createTable('foo', table => {
                table.string('bar');
            })
            .then(() => knex('foo').insert({ bar: 'foobar1' }))
            .then(() => expect(
                expect(knex('foo'), 'to have rows satisfying', expect.it('to equal', [
                    { bar: 'foobar1' }
                ])),
                'to be fulfilled'
            ));
        });

        it(`works when there's no data in the table`, function () {
            return knex.schema.createTable('foo', table => {
                table.string('bar');
            })
            .then(() => expect(
                expect(knex('foo'), 'to have rows satisfying', expect.it('to equal', [])),
                'to be fulfilled'
            ));
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
                expect(knex('foo'), 'to have rows satisfying', expect.it('to equal', [
                    { bar: 'foobar1' },
                    { bar: 'foobar20' }
                ])),
                'to be rejected with',
                dontIndent`
                expected 'select * from "foo"'
                to have rows satisfying expect.it('to equal', [ { bar: 'foobar1' }, { bar: 'foobar20' } ])

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
            ));
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
                expect(knex('foo'), 'to have rows satisfying', expect.it('to equal', [])),
                'to be rejected with',
                dontIndent`
                expected 'select * from "foo"' to have rows satisfying expect.it('to equal', [])

                expected [ { bar: 'foobar1' }, { bar: 'foobar2' } ] to equal []

                [
                  { bar: 'foobar1' }, // should be removed
                  { bar: 'foobar2' } // should be removed
                ]`
            ));
        });

        describe('with the "exhaustively" flag', function () {
            it('rejects if the row contains more columns than the expected output', function () {
                return knex.schema.createTable('foo', table => {
                    table.string('bar');
                    table.string('baz');
                })
                .then(() => knex('foo').insert([
                    { bar: 'bar1', baz: 'baz1' },
                    { bar: 'bar2', baz: 'baz2' }
                ]))
                .then(() => expect(
                    expect(knex('foo'), 'to have rows exhaustively satisfying', [
                        { bar: 'bar1' },
                        { bar: 'bar2' }
                    ]),
                    'to be rejected with',
                    dontIndent`
                    expected 'select * from "foo"'
                    to have rows exhaustively satisfying [ { bar: 'bar1' }, { bar: 'bar2' } ]

                    [
                      {
                        bar: 'bar1',
                        baz: 'baz1' // should be removed
                      },
                      {
                        bar: 'bar2',
                        baz: 'baz2' // should be removed
                      }
                    ]`
                ));
            });
        });

        describe('without the "exhaustively" flag', function () {
            it(`doesn't reject if the row contains more columns than the expected output`, function () {
                return knex.schema.createTable('foo', table => {
                    table.string('bar');
                    table.string('baz');
                })
                .then(() => knex('foo').insert([
                    { bar: 'bar1', baz: 'baz1' },
                    { bar: 'bar2', baz: 'baz2' }
                ]))
                .then(() => expect(
                    expect(knex('foo'), 'to have rows satisfying', [
                        { bar: 'bar1' },
                        { bar: 'bar2' }
                    ]),
                    'to be fulfilled'
                ));
            });
        });
    });

    describe('<knexQuery> to have a row satisfying <object>', function () {
        it('runs query.select() and asserts the data returned against the object', function () {
            return knex.schema.createTable('foo', table => {
                table.string('bar');
            })
            .then(() => knex('foo').insert({ bar: 'foobar1' }))
            .then(() => expect(
                expect(knex('foo'), 'to have a row satisfying', { bar: 'foobar1' }),
                'to be fulfilled'
            ));
        });

        it(`asserts that at least one record in the table satisfies the object`, function () {
            return knex.schema.createTable('foo', table => {
                table.string('bar');
            })
            .then(() => knex('foo').insert([
                { bar: 'foobar1' },
                { bar: 'foobar2' }
            ]))
            .then(() => expect(
                expect(knex('foo'), 'to have a row satisfying', { bar: 'foobar2' }),
                'to be fulfilled'
            ));
        });

        it(`does not assert against an empty object`, function () {
            return knex.schema.createTable('foo', table => {
                table.string('bar');
            })
            .then(() => knex('foo').insert([
                { bar: 'foobar1' },
                { bar: 'foobar2' }
            ]))
            .then(() => expect(
                () => expect(knex('foo'), 'to have a row satisfying', {}),
                'to be rejected with',
                dontIndent`
                expected 'select * from "foo"' to have a row satisfying {}
                  cannot assert that a row has no columns or fields`
            ));
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
                expect(knex('foo'), 'to have a row satisfying', { bar: 'foobar20' }),
                'to be rejected with',
                dontIndent`
                expected 'select * from "foo"' to have a row satisfying { bar: 'foobar20' }

                expected [ { bar: 'foobar1' }, { bar: 'foobar2' } ]
                to have an item satisfying { bar: 'foobar20' }`
            ));
        });
    });

    describe('<knex> to apply migration <string>', function () {
        it('applies a migration', function () {
            return expect(
                knex,
                'with the migrations directory containing', {
                    '1-foo.js': {
                        up: knex => knex.schema.createTable('foo', table => {
                            table.timestamps();
                        }),
                        down: knex => knex.schema.dropTable('foo')
                    }
                },
                'to apply migration', '1-foo.js'
            )
            .then(() => expect(knex, 'to have table', 'foo'));
        });

        it('migrates up, down, then up again to ensure the down migration is tested', function () {
            var callOrder = [];
            return expect(
                knex,
                'with the migrations directory containing', {
                    '1-foo.js': {
                        up: () => {
                            callOrder.push('up migration');
                            return Promise.resolve();
                        },
                        down: () => {
                            callOrder.push('down migration');
                            return Promise.resolve();
                        }
                    }
                },
                'to apply migration', '1-foo.js'
            )
            .then(() => expect(callOrder, 'to equal', [
                'up migration',
                'down migration',
                'up migration'
            ]));
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
                    expect(
                        knex,
                        'with no migrations directory',
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
                    expect(
                        knex,
                        'with an empty migrations directory',
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
                    expect(
                        knex,
                        'with the migrations directory containing', {
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

        describe('with a migration test function provided', function () {
            it('allows adding beforeUp, testUp, beforeDown, testDown and after callbacks', function () {
                return expect(
                    knex,
                    'with the migrations directory containing', {
                        '1-foo.js': {
                            up: () => Promise.resolve(),
                            down: () => Promise.resolve(),
                            test: function () {
                                this.beforeUp(() => {});
                                this.testUp(() => {});
                                this.beforeDown(() => {});
                                this.testDown(() => {});
                                this.after(() => {});
                            }
                        }
                    },
                    'to apply migration', '1-foo.js'
                );
            });

            it('throws an error if a provided hook is not a function', function () {
                return expect(
                    () => expect(
                        knex,
                        'with the migrations directory containing', {
                            '1-foo.js': {
                                up: () => Promise.resolve(),
                                down: () => Promise.resolve(),
                                test: function () {
                                    this.beforeUp('');
                                }
                            }
                        },
                        'to apply migration', '1-foo.js'
                    ),
                    'to error with',
                    dontIndent`
                    expected
                    ${knexOutputBlock}
                    to apply migration '1-foo.js'
                      the beforeUp hook must be a function`
                );
            });

            it('throws an error if an attempt is made to register a hook twice', function () {
                return expect(
                    () => expect(
                        knex,
                        'with the migrations directory containing', {
                            '1-foo.js': {
                                up: () => Promise.resolve(),
                                down: () => Promise.resolve(),
                                test: function () {
                                    this.beforeUp(() => {});
                                    this.beforeUp(() => {});
                                }
                            }
                        },
                        'to apply migration', '1-foo.js'
                    ),
                    'to error with',
                    dontIndent`
                    expected
                    ${knexOutputBlock}
                    to apply migration '1-foo.js'
                      a beforeUp hook has already been registered`
                );
            });

            describe('with a beforeUp hook', function () {
                it(`calls the hook with 'knex' and 'expect' instances`, function () {
                    return expect(
                        () => expect(
                            knex,
                            'with the migrations directory containing', {
                                '1-foo.js': {
                                    up: () => Promise.resolve(),
                                    down: () => Promise.resolve(),
                                    test: function () {
                                        this.beforeUp((passedKnex, passedExpect) => {
                                            expect(passedKnex, 'to equal', knex);
                                            passedExpect(1, 'to be', 1); // ¯\_(ツ)_/¯
                                        });
                                    }
                                }
                            },
                            'to apply migration', '1-foo.js'
                        ),
                        'not to error'
                    );
                });

                it('calls the hook before running the up migration', function () {
                    var callOrder = [];
                    return expect(
                        knex,
                        'with the migrations directory containing', {
                            'foo.js': {
                                up: () => {
                                    callOrder.push('up migration');
                                    return Promise.resolve();
                                },
                                down: () => {
                                    callOrder.push('down migration');
                                    return Promise.resolve();
                                },
                                test: function () {
                                    this.beforeUp(() => {
                                        callOrder.push('beforeUp hook');
                                    });
                                }
                            }
                        },
                        'to apply migration', 'foo.js'
                    )
                    .then(() => expect(callOrder, 'to equal', [
                        'beforeUp hook',
                        'up migration',
                        'down migration',
                        'up migration'
                    ]));
                });

                it('formats the error correctly if the hook throws a sync error', function () {
                    return expect(
                        () => expect(
                            knex,
                            'with the migrations directory containing', {
                                '1-foo.js': {
                                    up: () => Promise.resolve(),
                                    down: () => Promise.resolve(),
                                    test: function () {
                                        this.beforeUp(() => {
                                            throw new Error('beforeUp error');
                                        });
                                    }
                                }
                            },
                            'to apply migration', '1-foo.js'
                        ),
                        'to error with',
                        dontIndent`
                        expected
                        ${knexOutputBlock}
                        to apply migration '1-foo.js'
                          beforeUp failed with: Error('beforeUp error')`
                    );
                });

                it('formats the error correctly if the hook returns a rejected promise', function () {
                    return expect(
                        () => expect(
                            knex,
                            'with the migrations directory containing', {
                                '1-foo.js': {
                                    up: () => Promise.resolve(),
                                    down: () => Promise.resolve(),
                                    test: function () {
                                        this.beforeUp(() => {
                                            return Promise.reject(new Error('beforeUp error'));
                                        });
                                    }
                                }
                            },
                            'to apply migration', '1-foo.js'
                        ),
                        'to error with',
                        dontIndent`
                        expected
                        ${knexOutputBlock}
                        to apply migration '1-foo.js'
                          beforeUp failed with: Error('beforeUp error')`
                    );
                });
            });

            describe('with a testUp hook', function () {
                it(`calls the hook with 'knex' and 'expect' instances`, function () {
                    return expect(
                        () => expect(
                            knex,
                            'with the migrations directory containing', {
                                '1-foo.js': {
                                    up: () => Promise.resolve(),
                                    down: () => Promise.resolve(),
                                    test: function () {
                                        this.testUp((passedKnex, passedExpect) => {
                                            expect(passedKnex, 'to equal', knex);
                                            passedExpect(1, 'to be', 1); // ¯\_(ツ)_/¯
                                        });
                                    }
                                }
                            },
                            'to apply migration', '1-foo.js'
                        ),
                        'not to error'
                    );
                });

                it('calls the hook after running the up migration', function () {
                    var callOrder = [];
                    return expect(
                        knex,
                        'with the migrations directory containing', {
                            'foo.js': {
                                up: () => {
                                    callOrder.push('up migration');
                                    return Promise.resolve();
                                },
                                down: () => {
                                    callOrder.push('down migration');
                                    return Promise.resolve();
                                },
                                test: function () {
                                    this.testUp(() => {
                                        callOrder.push('testUp hook');
                                    });
                                }
                            }
                        },
                        'to apply migration', 'foo.js'
                    )
                    .then(() => expect(callOrder, 'to equal', [
                        'up migration',
                        'testUp hook',
                        'down migration',
                        'up migration'
                    ]));
                });

                it('formats the error correctly if the hook throws a sync error', function () {
                    return expect(
                        () => expect(
                            knex,
                            'with the migrations directory containing', {
                                '1-foo.js': {
                                    up: () => Promise.resolve(),
                                    down: () => Promise.resolve(),
                                    test: function () {
                                        this.testUp(() => {
                                            throw new Error('testUp error');
                                        });
                                    }
                                }
                            },
                            'to apply migration', '1-foo.js'
                        ),
                        'to error with',
                        dontIndent`
                        expected
                        ${knexOutputBlock}
                        to apply migration '1-foo.js'
                          testUp failed with: Error('testUp error')`
                    );
                });

                it('formats the error correctly if the hook returns a rejected promise', function () {
                    return expect(
                        () => expect(
                            knex,
                            'with the migrations directory containing', {
                                '1-foo.js': {
                                    up: () => Promise.resolve(),
                                    down: () => Promise.resolve(),
                                    test: function () {
                                        this.testUp(() => {
                                            return Promise.reject(new Error('testUp error'));
                                        });
                                    }
                                }
                            },
                            'to apply migration', '1-foo.js'
                        ),
                        'to error with',
                        dontIndent`
                        expected
                        ${knexOutputBlock}
                        to apply migration '1-foo.js'
                          testUp failed with: Error('testUp error')`
                    );
                });
            });

            describe('with a beforeDown hook', function () {
                it(`calls the hook with 'knex' and 'expect' instances`, function () {
                    return expect(
                        () => expect(
                            knex,
                            'with the migrations directory containing', {
                                '1-foo.js': {
                                    up: () => Promise.resolve(),
                                    down: () => Promise.resolve(),
                                    test: function () {
                                        this.beforeDown((passedKnex, passedExpect) => {
                                            expect(passedKnex, 'to equal', knex);
                                            passedExpect(1, 'to be', 1); // ¯\_(ツ)_/¯
                                        });
                                    }
                                }
                            },
                            'to apply migration', '1-foo.js'
                        ),
                        'not to error'
                    );
                });

                it('calls the hook before running the down migration', function () {
                    var callOrder = [];
                    return expect(
                        knex,
                        'with the migrations directory containing', {
                            'foo.js': {
                                up: () => {
                                    callOrder.push('up migration');
                                    return Promise.resolve();
                                },
                                down: () => {
                                    callOrder.push('down migration');
                                    return Promise.resolve();
                                },
                                test: function () {
                                    this.beforeDown(() => {
                                        callOrder.push('beforeDown hook');
                                    });
                                }
                            }
                        },
                        'to apply migration', 'foo.js'
                    )
                    .then(() => expect(callOrder, 'to equal', [
                        'up migration',
                        'beforeDown hook',
                        'down migration',
                        'up migration'
                    ]));
                });

                it('formats the error correctly if the hook throws a sync error', function () {
                    return expect(
                        () => expect(
                            knex,
                            'with the migrations directory containing', {
                                '1-foo.js': {
                                    up: () => Promise.resolve(),
                                    down: () => Promise.resolve(),
                                    test: function () {
                                        this.beforeDown(() => {
                                            throw new Error('beforeDown error');
                                        });
                                    }
                                }
                            },
                            'to apply migration', '1-foo.js'
                        ),
                        'to error with',
                        dontIndent`
                        expected
                        ${knexOutputBlock}
                        to apply migration '1-foo.js'
                          beforeDown failed with: Error('beforeDown error')`
                    );
                });

                it('formats the error correctly if the hook returns a rejected promise', function () {
                    return expect(
                        () => expect(
                            knex,
                            'with the migrations directory containing', {
                                '1-foo.js': {
                                    up: () => Promise.resolve(),
                                    down: () => Promise.resolve(),
                                    test: function () {
                                        this.beforeDown(() => {
                                            return Promise.reject(new Error('beforeDown error'));
                                        });
                                    }
                                }
                            },
                            'to apply migration', '1-foo.js'
                        ),
                        'to error with',
                        dontIndent`
                        expected
                        ${knexOutputBlock}
                        to apply migration '1-foo.js'
                          beforeDown failed with: Error('beforeDown error')`
                    );
                });
            });

            describe('with a testDown hook', function () {
                it(`calls the hook with 'knex' and 'expect' instances`, function () {
                    return expect(
                        () => expect(
                            knex,
                            'with the migrations directory containing', {
                                '1-foo.js': {
                                    up: () => Promise.resolve(),
                                    down: () => Promise.resolve(),
                                    test: function () {
                                        this.testDown((passedKnex, passedExpect) => {
                                            expect(passedKnex, 'to equal', knex);
                                            passedExpect(1, 'to be', 1); // ¯\_(ツ)_/¯
                                        });
                                    }
                                }
                            },
                            'to apply migration', '1-foo.js'
                        ),
                        'not to error'
                    );
                });

                it('calls the hook after running the down migration', function () {
                    var callOrder = [];
                    return expect(
                        knex,
                        'with the migrations directory containing', {
                            'foo.js': {
                                up: () => {
                                    callOrder.push('up migration');
                                    return Promise.resolve();
                                },
                                down: () => {
                                    callOrder.push('down migration');
                                    return Promise.resolve();
                                },
                                test: function () {
                                    this.testDown(() => {
                                        callOrder.push('testDown hook');
                                    });
                                }
                            }
                        },
                        'to apply migration', 'foo.js'
                    )
                    .then(() => expect(callOrder, 'to equal', [
                        'up migration',
                        'down migration',
                        'testDown hook',
                        'up migration'
                    ]));
                });

                it('formats the error correctly if the hook throws a sync error', function () {
                    return expect(
                        () => expect(
                            knex,
                            'with the migrations directory containing', {
                                '1-foo.js': {
                                    up: () => Promise.resolve(),
                                    down: () => Promise.resolve(),
                                    test: function () {
                                        this.testDown(() => {
                                            throw new Error('testDown error');
                                        });
                                    }
                                }
                            },
                            'to apply migration', '1-foo.js'
                        ),
                        'to error with',
                        dontIndent`
                        expected
                        ${knexOutputBlock}
                        to apply migration '1-foo.js'
                          testDown failed with: Error('testDown error')`
                    );
                });

                it('formats the error correctly if the hook returns a rejected promise', function () {
                    return expect(
                        () => expect(
                            knex,
                            'with the migrations directory containing', {
                                '1-foo.js': {
                                    up: () => Promise.resolve(),
                                    down: () => Promise.resolve(),
                                    test: function () {
                                        this.testDown(() => {
                                            return Promise.reject(new Error('testDown error'));
                                        });
                                    }
                                }
                            },
                            'to apply migration', '1-foo.js'
                        ),
                        'to error with',
                        dontIndent`
                        expected
                        ${knexOutputBlock}
                        to apply migration '1-foo.js'
                          testDown failed with: Error('testDown error')`
                    );
                });
            });

            describe('with a after hook', function () {
                it(`calls the hook with 'knex' and 'expect' instances`, function () {
                    return expect(
                        () => expect(
                            knex,
                            'with the migrations directory containing', {
                                '1-foo.js': {
                                    up: () => Promise.resolve(),
                                    down: () => Promise.resolve(),
                                    test: function () {
                                        this.after((passedKnex, passedExpect) => {
                                            expect(passedKnex, 'to equal', knex);
                                            passedExpect(1, 'to be', 1); // ¯\_(ツ)_/¯
                                        });
                                    }
                                }
                            },
                            'to apply migration', '1-foo.js'
                        ),
                        'not to error'
                    );
                });

                it('calls the hook after running the down migration', function () {
                    var callOrder = [];
                    return expect(
                        knex,
                        'with the migrations directory containing', {
                            'foo.js': {
                                up: () => {
                                    callOrder.push('up migration');
                                    return Promise.resolve();
                                },
                                down: () => {
                                    callOrder.push('down migration');
                                    return Promise.resolve();
                                },
                                test: function () {
                                    this.after(() => {
                                        callOrder.push('after hook');
                                    });
                                }
                            }
                        },
                        'to apply migration', 'foo.js'
                    )
                    .then(() => expect(callOrder, 'to equal', [
                        'up migration',
                        'down migration',
                        'up migration',
                        'after hook'
                    ]));
                });

                it('formats the error correctly if the hook throws a sync error', function () {
                    return expect(
                        () => expect(
                            knex,
                            'with the migrations directory containing', {
                                '1-foo.js': {
                                    up: () => Promise.resolve(),
                                    down: () => Promise.resolve(),
                                    test: function () {
                                        this.after(() => {
                                            throw new Error('after error');
                                        });
                                    }
                                }
                            },
                            'to apply migration', '1-foo.js'
                        ),
                        'to error with',
                        dontIndent`
                        expected
                        ${knexOutputBlock}
                        to apply migration '1-foo.js'
                          after failed with: Error('after error')`
                    );
                });

                it('formats the error correctly if the hook returns a rejected promise', function () {
                    return expect(
                        () => expect(
                            knex,
                            'with the migrations directory containing', {
                                '1-foo.js': {
                                    up: () => Promise.resolve(),
                                    down: () => Promise.resolve(),
                                    test: function () {
                                        this.after(() => {
                                            return Promise.reject(new Error('after error'));
                                        });
                                    }
                                }
                            },
                            'to apply migration', '1-foo.js'
                        ),
                        'to error with',
                        dontIndent`
                        expected
                        ${knexOutputBlock}
                        to apply migration '1-foo.js'
                          after failed with: Error('after error')`
                    );
                });
            });

            describe('with all hooks', function () {
                it('calls beforeUp, up migration, testUp, beforeDown, down migration, testDown, up migration, after', function () {
                    var callOrder = [];
                    return expect(
                        knex,
                        'with the migrations directory containing', {
                            'foo.js': {
                                up: () => {
                                    callOrder.push('up migration');
                                    return Promise.resolve();
                                },
                                down: () => {
                                    callOrder.push('down migration');
                                    return Promise.resolve();
                                },
                                test: function () {
                                    this.beforeUp(() => {
                                        callOrder.push('beforeUp hook');
                                    });
                                    this.testUp(() => {
                                        callOrder.push('testUp hook');
                                    });
                                    this.beforeDown(() => {
                                        callOrder.push('beforeDown hook');
                                    });
                                    this.testDown(() => {
                                        callOrder.push('testDown hook');
                                    });
                                    this.after(() => {
                                        callOrder.push('after hook');
                                    });
                                }
                            }
                        },
                        'to apply migration', 'foo.js'
                    )
                    .then(() => expect(callOrder, 'to equal', [
                        'beforeUp hook',
                        'up migration',
                        'testUp hook',
                        'beforeDown hook',
                        'down migration',
                        'testDown hook',
                        'up migration',
                        'after hook'
                    ]));
                });

                it('halts at beforeUp if it fails', function () {
                    var callOrder = [];
                    return expect(
                        () => expect(
                            knex,
                            'with the migrations directory containing', {
                                'foo.js': {
                                    up: () => {
                                        callOrder.push('up migration');
                                        return Promise.resolve();
                                    },
                                    down: () => {
                                        callOrder.push('down migration');
                                        return Promise.resolve();
                                    },
                                    test: function () {
                                        this.beforeUp(() => {
                                            callOrder.push('beforeUp hook');
                                            return Promise.reject(
                                                new Error('beforeUp error')
                                            );
                                        });
                                        this.testUp(() => {
                                            callOrder.push('testUp hook');
                                        });
                                        this.beforeDown(() => {
                                            callOrder.push('beforeDown hook');
                                        });
                                        this.testDown(() => {
                                            callOrder.push('testDown hook');
                                        });
                                        this.after(() => {
                                            callOrder.push('after hook');
                                        });
                                    }
                                }
                            },
                            'to apply migration', 'foo.js'
                        ),
                        'to error with',
                        dontIndent`
                        expected
                        ${knexOutputBlock}
                        to apply migration 'foo.js'
                          beforeUp failed with: Error('beforeUp error')`
                    )
                    .then(() => expect(callOrder, 'to equal', [
                        'beforeUp hook'
                    ]));
                });

                it('halts at up migration if it fails', function () {
                    var callOrder = [];
                    return expect(
                        () => expect(
                            knex,
                            'with the migrations directory containing', {
                                'foo.js': {
                                    up: () => {
                                        callOrder.push('up migration');
                                        return Promise.reject(
                                            new Error('up migration error')
                                        );
                                    },
                                    down: () => {
                                        callOrder.push('down migration');
                                        return Promise.resolve();
                                    },
                                    test: function () {
                                        this.beforeUp(() => {
                                            callOrder.push('beforeUp hook');
                                        });
                                        this.testUp(() => {
                                            callOrder.push('testUp hook');
                                        });
                                        this.beforeDown(() => {
                                            callOrder.push('beforeDown hook');
                                        });
                                        this.testDown(() => {
                                            callOrder.push('testDown hook');
                                        });
                                        this.after(() => {
                                            callOrder.push('after hook');
                                        });
                                    }
                                }
                            },
                            'to apply migration', 'foo.js'
                        ),
                        'to error with',
                        dontIndent`
                        expected
                        ${knexOutputBlock}
                        to apply migration 'foo.js'
                          up migration failed with: Error('up migration error')`
                    )
                    .then(() => expect(callOrder, 'to equal', [
                        'beforeUp hook',
                        'up migration'
                    ]));
                });

                it('halts at testUp if it fails', function () {
                    var callOrder = [];
                    return expect(
                        () => expect(
                            knex,
                            'with the migrations directory containing', {
                                'foo.js': {
                                    up: () => {
                                        callOrder.push('up migration');
                                        return Promise.resolve();
                                    },
                                    down: () => {
                                        callOrder.push('down migration');
                                        return Promise.resolve();
                                    },
                                    test: function () {
                                        this.beforeUp(() => {
                                            callOrder.push('beforeUp hook');
                                        });
                                        this.testUp(() => {
                                            callOrder.push('testUp hook');
                                            return Promise.reject(
                                                new Error('testUp error')
                                            );
                                        });
                                        this.beforeDown(() => {
                                            callOrder.push('beforeDown hook');
                                        });
                                        this.testDown(() => {
                                            callOrder.push('testDown hook');
                                        });
                                        this.after(() => {
                                            callOrder.push('after hook');
                                        });
                                    }
                                }
                            },
                            'to apply migration', 'foo.js'
                        ),
                        'to error with',
                        dontIndent`
                        expected
                        ${knexOutputBlock}
                        to apply migration 'foo.js'
                          testUp failed with: Error('testUp error')`
                    )
                    .then(() => expect(callOrder, 'to equal', [
                        'beforeUp hook',
                        'up migration',
                        'testUp hook'
                    ]));
                });

                it('halts at beforeDown if it fails', function () {
                    var callOrder = [];
                    return expect(
                        () => expect(
                            knex,
                            'with the migrations directory containing', {
                                'foo.js': {
                                    up: () => {
                                        callOrder.push('up migration');
                                        return Promise.resolve();
                                    },
                                    down: () => {
                                        callOrder.push('down migration');
                                        return Promise.resolve();
                                    },
                                    test: function () {
                                        this.beforeUp(() => {
                                            callOrder.push('beforeUp hook');
                                        });
                                        this.testUp(() => {
                                            callOrder.push('testUp hook');
                                        });
                                        this.beforeDown(() => {
                                            callOrder.push('beforeDown hook');
                                            return Promise.reject(
                                                new Error('beforeDown error')
                                            );
                                        });
                                        this.testDown(() => {
                                            callOrder.push('testDown hook');
                                        });
                                        this.after(() => {
                                            callOrder.push('after hook');
                                        });
                                    }
                                }
                            },
                            'to apply migration', 'foo.js'
                        ),
                        'to error with',
                        dontIndent`
                        expected
                        ${knexOutputBlock}
                        to apply migration 'foo.js'
                          beforeDown failed with: Error('beforeDown error')`
                    )
                    .then(() => expect(callOrder, 'to equal', [
                        'beforeUp hook',
                        'up migration',
                        'testUp hook',
                        'beforeDown hook'
                    ]));
                });

                it('halts at down migration if it fails', function () {
                    var callOrder = [];
                    return expect(
                        () => expect(
                            knex,
                            'with the migrations directory containing', {
                                'foo.js': {
                                    up: () => {
                                        callOrder.push('up migration');
                                        return Promise.resolve();
                                    },
                                    down: () => {
                                        callOrder.push('down migration');
                                        return Promise.reject(
                                            new Error('down migration error')
                                        );
                                    },
                                    test: function () {
                                        this.beforeUp(() => {
                                            callOrder.push('beforeUp hook');
                                        });
                                        this.testUp(() => {
                                            callOrder.push('testUp hook');
                                        });
                                        this.beforeDown(() => {
                                            callOrder.push('beforeDown hook');
                                        });
                                        this.testDown(() => {
                                            callOrder.push('testDown hook');
                                        });
                                        this.after(() => {
                                            callOrder.push('after hook');
                                        });
                                    }
                                }
                            },
                            'to apply migration', 'foo.js'
                        ),
                        'to error with',
                        dontIndent`
                        expected
                        ${knexOutputBlock}
                        to apply migration 'foo.js'
                          down migration failed with: Error('down migration error')`
                    )
                    .then(() => expect(callOrder, 'to equal', [
                        'beforeUp hook',
                        'up migration',
                        'testUp hook',
                        'beforeDown hook',
                        'down migration'
                    ]));
                });

                it('halts at testDown if it fails', function () {
                    var callOrder = [];
                    return expect(
                        () => expect(
                            knex,
                            'with the migrations directory containing', {
                                'foo.js': {
                                    up: () => {
                                        callOrder.push('up migration');
                                        return Promise.resolve();
                                    },
                                    down: () => {
                                        callOrder.push('down migration');
                                        return Promise.resolve();
                                    },
                                    test: function () {
                                        this.beforeUp(() => {
                                            callOrder.push('beforeUp hook');
                                        });
                                        this.testUp(() => {
                                            callOrder.push('testUp hook');
                                        });
                                        this.beforeDown(() => {
                                            callOrder.push('beforeDown hook');
                                        });
                                        this.testDown(() => {
                                            callOrder.push('testDown hook');
                                            return Promise.reject(
                                                new Error('testDown error')
                                            );
                                        });
                                        this.after(() => {
                                            callOrder.push('after hook');
                                        });
                                    }
                                }
                            },
                            'to apply migration', 'foo.js'
                        ),
                        'to error with',
                        dontIndent`
                        expected
                        ${knexOutputBlock}
                        to apply migration 'foo.js'
                          testDown failed with: Error('testDown error')`
                    )
                    .then(() => expect(callOrder, 'to equal', [
                        'beforeUp hook',
                        'up migration',
                        'testUp hook',
                        'beforeDown hook',
                        'down migration',
                        'testDown hook'
                    ]));
                });

                it('halts at the second up migration if it fails on the second run', function () {
                    var callOrder = [];
                    var firstRun = true;
                    return expect(
                        () => expect(
                            knex,
                            'with the migrations directory containing', {
                                'foo.js': {
                                    up: () => {
                                        callOrder.push('up migration');
                                        if (firstRun) {
                                            firstRun = false;
                                            return Promise.resolve();
                                        }
                                        return Promise.reject(
                                            new Error('second up migration error')
                                        );
                                    },
                                    down: () => {
                                        callOrder.push('down migration');
                                        return Promise.resolve();
                                    },
                                    test: function () {
                                        this.beforeUp(() => {
                                            callOrder.push('beforeUp hook');
                                        });
                                        this.testUp(() => {
                                            callOrder.push('testUp hook');
                                        });
                                        this.beforeDown(() => {
                                            callOrder.push('beforeDown hook');
                                        });
                                        this.testDown(() => {
                                            callOrder.push('testDown hook');
                                        });
                                        this.after(() => {
                                            callOrder.push('after hook');
                                        });
                                    }
                                }
                            },
                            'to apply migration', 'foo.js'
                        ),
                        'to error with',
                        dontIndent`
                        expected
                        ${knexOutputBlock}
                        to apply migration 'foo.js'
                          up migration after down migration failed with: Error('second up migration error')`
                    )
                    .then(() => expect(callOrder, 'to equal', [
                        'beforeUp hook',
                        'up migration',
                        'testUp hook',
                        'beforeDown hook',
                        'down migration',
                        'testDown hook',
                        'up migration'
                    ]));
                });

                it('halts at after if it fails', function () {
                    var callOrder = [];
                    return expect(
                        () => expect(
                            knex,
                            'with the migrations directory containing', {
                                'foo.js': {
                                    up: () => {
                                        callOrder.push('up migration');
                                        return Promise.resolve();
                                    },
                                    down: () => {
                                        callOrder.push('down migration');
                                        return Promise.resolve();
                                    },
                                    test: function () {
                                        this.beforeUp(() => {
                                            callOrder.push('beforeUp hook');
                                        });
                                        this.testUp(() => {
                                            callOrder.push('testUp hook');
                                        });
                                        this.beforeDown(() => {
                                            callOrder.push('beforeDown hook');
                                        });
                                        this.testDown(() => {
                                            callOrder.push('testDown hook');
                                        });
                                        this.after(() => {
                                            callOrder.push('after hook');
                                            return Promise.reject(
                                                new Error('after error')
                                            );
                                        });
                                    }
                                }
                            },
                            'to apply migration', 'foo.js'
                        ),
                        'to error with',
                        dontIndent`
                        expected
                        ${knexOutputBlock}
                        to apply migration 'foo.js'
                          after failed with: Error('after error')`
                    )
                    .then(() => expect(callOrder, 'to equal', [
                        'beforeUp hook',
                        'up migration',
                        'testUp hook',
                        'beforeDown hook',
                        'down migration',
                        'testDown hook',
                        'up migration',
                        'after hook'
                    ]));
                });
            });
        });

        describe('with multiple migration files', function () {
            it('run all migrations before the provided filename', function () {
                return expect(
                    knex,
                    'with the migrations directory containing', {
                        '1-foo.js': {
                            up: knex => knex.schema.createTable('foo', table => {
                                table.timestamps();
                            }),
                            down: knex => knex.schema.dropTable('foo')
                        },
                        '2-foo.js': {
                            up: knex => knex.schema.table('foo', table => {
                                table.string('bar');
                            }),
                            down: knex => knex.schema.table('foo', table => {
                                table.dropColumn('bar');
                            })
                        }
                    },
                    'to apply migration', '2-foo.js'
                )
                .then(() => expect(knex, 'to have column', { foo: 'bar' }));
            });

            it('run all migrations before the provided filename after sorting', function () {
                return expect(
                    knex,
                    'with the migrations directory containing', {
                        '2-foo.js': {
                            up: knex => knex.schema.table('foo', table => {
                                table.string('bar');
                            }),
                            down: knex => knex.schema.table('foo', table => {
                                table.dropColumn('bar');
                            })
                        },
                        '1-foo.js': {
                            up: knex => knex.schema.createTable('foo', table => {
                                table.timestamps();
                            }),
                            down: knex => knex.schema.dropTable('foo')
                        }
                    },
                    'to apply migration', '2-foo.js'
                )
                .then(() => expect(knex, 'to have column', { foo: 'bar' }));
            });

            it('does not run migrations after the provided filename', function () {
                return expect(
                    knex,
                    'with the migrations directory containing', {
                        '1-foo.js': {
                            up: knex => knex.schema.createTable('foo', table => {
                                table.timestamps();
                            }),
                            down: knex => knex.schema.dropTable('foo')
                        },
                        '2-foo.js': {
                            up: knex => knex.schema.table('foo', table => {
                                table.string('bar');
                            }),
                            down: knex => knex.schema.table('foo', table => {
                                table.dropColumn('bar');
                            })
                        },
                        '3-foo.js': {
                            up: knex => knex.schema.createTable('bar', table => {
                                table.dropColumn('baz');
                            }),
                            down: knex => knex.schema.dropTable('bar')
                        }
                    },
                    'to apply migration', '2-foo.js'
                )
                .then(() => expect(knex, 'to have column', { foo: 'bar' }))
                .then(() => expect(knex, 'not to have table', 'bar'));
            });
        });
    });
});
