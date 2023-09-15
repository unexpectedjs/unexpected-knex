const util = require('util');
const Knex = require('knex');
const proxyquire = require('proxyquire');
const QueryBuilder = require('knex/lib/query/builder');
const knexMigrationListResolver = require('knex/lib/migrate/migration-list-resolver');

let unexpectedKnexMigratorFilename;
const getUnexpectedKnexMigratorFilenames = function (sources) {
  const filenameIndex = sources.findIndex(function (source) {
    return source.file === unexpectedKnexMigratorFilename;
  });
  return sources.slice(0, filenameIndex + 1);
};
const unexpectedKnexMigrationListResolver = Object.assign(
  {},
  knexMigrationListResolver,
  {
    listAllAndCompleted(config, trxOrKnex) {
      return knexMigrationListResolver
        .listAllAndCompleted(config, trxOrKnex)
        .then(function ([sources, completed]) {
          return [getUnexpectedKnexMigratorFilenames(sources), completed];
        });
    },
  },
);

const UnexpectedKnexMigrator = proxyquire('knex/lib/migrate/Migrator', {
  './migration-list-resolver': unexpectedKnexMigrationListResolver,
}).Migrator;

function MigrationTest(knex, expect) {
  this.knex = knex;
  this.expect = expect;
  this._hooks = {};
}

MigrationTest.prototype._getHook = function (name) {
  return this._hooks[name];
};

MigrationTest.prototype._hasHook = function (name) {
  return Object.keys(this._hooks).indexOf(name) > -1;
};

MigrationTest.prototype._addHook = function (name, callback) {
  if (this._hasHook(name)) {
    return this.expect.fail(`a ${name} hook has already been registered`);
  }
  if (typeof callback !== 'function') {
    return this.expect.fail(`the ${name} hook must be a function`);
  }
  this._hooks[name] = callback;
};

MigrationTest.prototype._runHook = function (name) {
  return this.expect.promise(
    function () {
      if (this._hasHook(name)) {
        return this._getHook(name).call(this, this.knex, this.expect);
      }
    }.bind(this),
  );
};

MigrationTest.prototype.beforeUp = function (callback) {
  this._addHook('beforeUp', callback);
};

MigrationTest.prototype.testUp = function (callback) {
  this._addHook('testUp', callback);
};

MigrationTest.prototype.beforeDown = function (callback) {
  this._addHook('beforeDown', callback);
};

MigrationTest.prototype.testDown = function (callback) {
  this._addHook('testDown', callback);
};

MigrationTest.prototype.after = function (callback) {
  this._addHook('after', callback);
};

function init(expect) {
  expect.output.preferredWidth = 80;

  expect.addType({
    name: 'knex',
    base: 'object',
    identify: function (instance) {
      return (
        typeof instance === 'function' && instance.client instanceof Knex.Client
      );
    },
    inspect: function (value, depth, output, inspect) {
      output
        .jsFunctionName('knex')
        .text('(')
        .appendInspected(value.client.config)
        .text(')');
    },
  });

  function getSchemaFromTable(knex, table) {
    let schema;
    const dotIndex = table.indexOf('.');

    if (dotIndex < 0) {
      schema = knex.schema;
    } else {
      schema = knex.schema.withSchema(table.slice(0, dotIndex));
      table = table.slice(dotIndex + 1);
    }

    return {
      schema,
      table,
    };
  }

  expect.addAssertion(
    '<knex> [not] to have table <string>',
    function (expect, knex, tableName) {
      const { schema, table } = getSchemaFromTable(knex, tableName);

      return expect(
        schema.hasTable(table),
        'to be fulfilled with',
        !expect.flags.not,
      );
    },
  );

  expect.addAssertion(
    '<knex> [not] to have column <object>',
    function (expect, knex, columnDefinition) {
      const valueType = expect.argTypes[0];
      const tableNames = valueType.getKeys(columnDefinition);

      if (tableNames.length > 1) {
        expect.errorMode = 'nested';
        return expect.fail(
          'Provide a single column in the form: { tableName: columnName }',
        );
      }

      const tableName = tableNames[0];
      const columnName = columnDefinition[tableName];

      const { schema, table } = getSchemaFromTable(knex, tableName);

      return expect(
        schema.hasColumn(table, columnName),
        'to be fulfilled with',
        !expect.flags.not,
      );
    },
  );

  expect.addAssertion(
    '<knex> [not] to have columns <object>',
    function (expect, knex, columnDefinition) {
      expect.errorMode = 'nested';
      const tableNames = Object.keys(columnDefinition);
      const assertions = tableNames.reduce(function (assertions, tableName) {
        let columnNames = columnDefinition[tableName];
        if (!Array.isArray(columnNames)) {
          columnNames = [columnNames];
        }
        return assertions.concat(
          columnNames.map(function (columnName) {
            const column = {};
            column[tableName] = columnName;
            return expect(knex, '[not] to have column', column);
          }),
        );
      }, []);
      return expect.promise.all(assertions);
    },
  );

  expect.addType({
    name: 'knexQuery',
    base: 'object',
    identify: function (value) {
      return value instanceof QueryBuilder;
    },
    inspect: function (value, depth, output, inspect) {
      output.appendInspected(value.toQuery());
    },
  });

  expect.addAssertion(
    '<knex|knexQuery> with table <string> <assertion?>',
    function (expect, knex, table) {
      expect.errorMode = 'bubble';

      return expect.shift(knex.from(table));
    },
  );

  expect.addAssertion(
    '<knex> with schema <string> <assertion?>',
    function (expect, knex, schema) {
      expect.errorMode = 'bubble';

      return expect.shift(knex.withSchema(schema));
    },
  );

  expect.addAssertion(
    [
      '<knexQuery> to have rows [exhaustively] satisfying <array>',
      '<knexQuery> to have rows [exhaustively] satisfying <expect.it>',
    ],
    function (expect, query, value) {
      expect.errorMode = 'defaultOrNested';
      return expect(
        query.select(),
        'to be fulfilled with value [exhaustively] satisfying',
        value,
      );
    },
  );

  expect.addAssertion(
    '<knexQuery> [not] to be empty',
    function (expect, query) {
      expect.errorMode = 'defaultOrNested';
      return expect(
        query,
        'to have rows satisfying',
        expect.it('[not] to be empty'),
      );
    },
  );

  expect.addAssertion(
    '<knexQuery> to have a row [exhaustively] satisfying <object>',
    function (expect, query, value) {
      expect.errorMode = 'defaultOrNested';
      if (Object.keys(value).length < 1) {
        return expect.fail('cannot assert that a row has no columns or fields');
      }
      return expect(
        query,
        'to have rows satisfying',
        expect.it('to have an item [exhaustively] satisfying', value),
      );
    },
  );

  function ascendingOrder(a, b) {
    return parseInt(a.id) - parseInt(b.id);
  }

  expect.addAssertion(
    '<knexQuery> to have sorted rows [exhaustively] satisfying <array>',
    function (expect, subject, value) {
      expect.errorMode = 'defaultOrNested';
      return expect(
        subject,
        'to have rows satisfying',
        expect.it(
          'sorted by',
          ascendingOrder,
          'to [exhaustively] satisfy',
          value,
        ),
      );
    },
  );

  expect.addAssertion(
    '<Promise> to be fulfilled with sorted rows [exhaustively] satisfying <array>',
    function (expect, subject, value) {
      expect.errorMode = 'defaultOrNested';
      return expect(
        subject,
        'to be fulfilled with value satisfying',
        expect.it(
          'sorted by',
          ascendingOrder,
          'to [exhaustively] satisfy',
          value,
        ),
      );
    },
  );

  expect.addAssertion(
    '<knex> to apply migration <string>',
    async function (expect, knex, filename) {
      expect.errorMode = 'nested';

      if (!filename) {
        return expect.fail('the filename cannot be an empty string');
      }

      function fail(message, error) {
        return expect.fail({
          output: function (output) {
            output.error(message).error(': ').appendErrorMessage(error);
          },
          originalError: error,
        });
      }

      unexpectedKnexMigratorFilename = filename;

      const migrator = new UnexpectedKnexMigrator(knex);
      const test = new MigrationTest(knex, expect);
      let migration;

      function getMigration() {
        return migrator.config.migrationSource
          .getMigrations()
          .then(function (sources) {
            const source = sources.find(function (migration) {
              return migration.file === filename;
            });
            if (!source) {
              throw new Error(`migration ${util.inspect(filename)} not found`);
            }
            return migrator.config.migrationSource.getMigration(source);
          });
      }

      function migrateUp() {
        return migrator.latest();
      }

      function migrateDown() {
        return migrator.rollback();
      }

      return getMigration()
        .then(function (_migration) {
          migration = _migration;
        })
        .catch(function (e) {
          return fail('cannot load migration', e);
        })
        .then(function () {
          if (typeof migration.test === 'function') {
            migration.test.call(test);
          }
        })
        .then(function () {
          return test._runHook('beforeUp').catch(function (e) {
            return fail('beforeUp failed with', e);
          });
        })
        .then(function () {
          return migrateUp().catch(function (e) {
            return fail('up migration failed with', e);
          });
        })
        .then(function () {
          return test._runHook('testUp').catch(function (e) {
            return fail('testUp failed with', e);
          });
        })
        .then(function () {
          return test._runHook('beforeDown').catch(function (e) {
            return fail('beforeDown failed with', e);
          });
        })
        .then(function () {
          return migrateDown().catch(function (e) {
            return fail('down migration failed with', e);
          });
        })
        .then(function () {
          return test._runHook('testDown').catch(function (e) {
            return fail('testDown failed with', e);
          });
        })
        .then(function () {
          return migrateUp().catch(function (e) {
            return fail('up migration after down migration failed with', e);
          });
        })
        .then(function () {
          return test._runHook('after').catch(function (e) {
            return fail('after failed with', e);
          });
        });
    },
  );
}

module.exports = {
  name: 'unexpected-knex',
  installInto: init,
};
