# unexpected-knex

[![Build Status](https://travis-ci.org/unexpectedjs/unexpected-knex.svg?branch=master)](https://travis-ci.org/unexpectedjs/unexpected-knex)
[![Coverage Status](https://coveralls.io/repos/github/unexpectedjs/unexpected-knex/badge.svg?branch=master)](https://coveralls.io/github/unexpectedjs/unexpected-knex?branch=master)
[![Dependency Status](https://david-dm.org/unexpectedjs/unexpected-knex.svg)](https://david-dm.org/unexpectedjs/unexpected-knex)

Provides support for testing [Knex.js](http://knexjs.org/) database models and
migrations using [Unexpected](http://unexpected.js.org/).

## Usage

Say you have a migration that creates a "user" table:
```js
// ./migrations/001-create-user.js
exports.up = function (knex) {
    return knex.schema.createTable('user', function (table) {
        table.increments();
        table.string('first_name');
        table.string('last_name');
    });
};

exports.down = function (knex) {
    return knex.schema.dropTable('user');
};
```

You can test that this migration will apply without error and that it actually
works against your database:
```js
// ./test/migrations.spec.js
var knexFactory = require('knex');
var expect = require('unexpected').clone().use(require('unexpected-knex'));

describe('migrations', function () {
    function createKnex() {
        // set up an in-memory SQLite database to run tests against
        // requires you to install the 'sqlite3' module
        return knexFactory({
            client: 'sqlite3',
            connection: {
                filename: ':memory:'
            },
            migrations: {
                directory: './migrations'
            },
            useNullAsDefault: true // recommended setting for sqlite databases
        });
    }

    var knex = createKnex();
    afterEach(function () {
        // drop the in-memory database and recreate it after each test to keep
        // your unit tests independent of each other
        return knex.destroy().then(function () {
            knex = createKnex();
        });
    })

    describe('001-create-user.js', function () {
        it('creates a "user" table', function () {
            return expect(knex, 'to apply migration', '001-create-user.js')
                .then(function () {
                    return expect(knex, 'to have table', 'user')
                        .and('to have columns', {
                            user: [ 'id', 'first_name', 'last_name']
                        });
                });
        });
    });
});
```

> Ideally you want to test migrations using a sample database that is similar to
your production database. This therefore assumes that you're running an SQLite
database in production. If you run a postgres database and want to test
against that instead, try the
[mocha-docker-postgres](https://github.com/One-com/node-mocha-docker-postgres)
project.

Alternatively, you can add the test in the migration file if you'd like to keep
things in context:

```js
// ./migrations/001-create-user.js

// exports.up and exports.down omitted for brevity

exports.test = function () {
    this.testUp(function (knex, expect) {
        return expect(knex, 'to have table', 'user')
            .and('to have columns', {
                user: [ 'id', 'first_name', 'last_name' ]
            });
    });
}
```

In this case, the unit test can be written as follows. The `to apply migration`
assertion will run the test defined in the migration file.

```js
// ./test/migrations.spec.js
describe('001-create-user.js', function () {
    it('creates a "user" table', function () {
        return expect(knex, 'to apply migration', '001-create-user.js');
    });
});
```

`exports.test` is consumed by this plugin and not by Knex. You only add if you
would like to test your migrations using this plugin. In this example, `testUp`
is a hook that is run by the `to apply migration` assertion after running the
`up` migration. You can also add other hooks to set up the database before
running the migration or to tear it down:

```js
exports.test = function () {
    this.beforeUp(function (knex, expect) {
        // called before running the up migration
    });

    this.testUp(function (knex, expect) {
        // called after running the up migration, to test the up migration
    });

    this.beforeDown(function (knex, expect) {
        // called before running the down migration
    });

    this.testDown(function (knex, expect) {
        // called after running the down migration, to test the down migration
    });

    this.after(function (knex, expect) {
        // called after everything else
    });
}
```

All these hooks are optional. The plugin will actually actual order of calls is
as follows:

1. beforeUp hook if provided
2. up migration
3. testUp hook if provided
4. beforeDown hook if provided
5. down migration
6. testDown hook if provided
7. up migration again
8. after hook if provided

The up migration is ran twice in order to check that your down migration works
*and* that the up migration can still be applied after your down migration.

To demonstrate these hooks, we'll assume you now have to merge the "first_name"
and "last_name" columns into a "name" column:

```js
// ./migrations/002-merge-user-names.js
exports.up = function (knex) {
    return knex.schema.table('user', function (table) {
        table.string('name');
    }).then(function () {
        return knex('user').select().then(function (users) {
            return Promise.all(users.map(function (user) {
                return knex('user')
                    .where('id', '=', user.id)
                    .update('name', user.first_name + ' ' + user.last_name);
            }));
        });
    }).then(function () {
        return knex.schema.table('user', function (table) {
            table.dropColumn('first_name');
            table.dropColumn('last_name');
        });
    });
};

exports.down = function (knex) {
    return knex.schema.table('user', function (table) {
        table.string('first_name');
        table.string('last_name');
    }).then(function () {
        return knex('user').select().then(function (users) {
            return Promise.all(users.map(function (user) {
                var names = user.name.split(' ');
                return knex('user')
                    .where('id', '=', user.id)
                    .update({
                        first_name: names[0],
                        last_name: names[1]
                    });
            }));
        });
    }).then(function () {
        return knex.schema.table('user', function (table) {
            table.dropColumn('name');
        });
    });
};

exports.test = function () {
    this.beforeUp(function (knex) {
        return knex('user').insert([
            { first_name: 'John', last_name: 'Doe' },
            { first_name: 'Jane', last_name: 'Doe' },
            { first_name: 'John', last_name: 'Smith' }
        ]);
    });

    this.testUp(function (knex, expect) {
        return expect(knex, 'with table', 'user', 'to have rows satisfying', [
            { name: 'John Doe', first_name: undefined, last_name: undefined },
            { name: 'Jane Doe', first_name: undefined, last_name: undefined },
            { name: 'John Smith', first_name: undefined, last_name: undefined }
        ]);
    });

    this.testDown(function (knex, expect) {
        return expect(knex, 'with table', 'user', 'to have rows satisfying', [
            { first_name: 'John', last_name: 'Doe', name: undefined },
            { first_name: 'Jane', last_name: 'Doe', name: undefined },
            { first_name: 'John', last_name: 'Smith', name: undefined }
        ]);
    })

    this.after(function (knex) {
        return knex('user').delete();
    });
};
```

Then test this migration:

```js
describe('002-merge-user-names.js', function () {
    it('merges the first_name and last_name columns into a name column', function () {
        return expect(knex, 'to apply migration', '002-merge-user-names.js');
    });
});
```

This is of course a minimal example, your migrations will typically be dealing
with a lot more complex and sometimes unexpected user data which is a good reason
to test them.
