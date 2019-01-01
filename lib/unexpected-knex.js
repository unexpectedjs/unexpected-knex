var path = require('path');
var Knex = require('knex');
var proxyquire = require('proxyquire');
var QueryBuilder = require('knex/lib/query/builder');
var knexMigrationListResolver = require('knex/lib/migrate/migration-list-resolver');

var unexpectedKnexMigratorFilename;
var getUnexpectedKnexMigratorFilenames = function(filenames) {
  var filenameIndex = filenames.indexOf(unexpectedKnexMigratorFilename);
  return filenames.slice(0, filenameIndex + 1);
};
var unexpectedKnexMigrationListResolver = Object.assign(
  {},
  knexMigrationListResolver,
  {
    listAllAndCompleted(config, trxOrKnex, absoluteConfigDir) {
      return knexMigrationListResolver
        .listAllAndCompleted(config, trxOrKnex, absoluteConfigDir)
        .then(function([filenames, completed]) {
          return [getUnexpectedKnexMigratorFilenames(filenames), completed];
        });
    }
  }
);

var UnexpectedKnexMigrator = proxyquire('knex/lib/migrate', {
  './migration-list-resolver': unexpectedKnexMigrationListResolver
});

function MigrationTest(knex, expect) {
  this.knex = knex;
  this.expect = expect;
  this._hooks = {};
}

MigrationTest.prototype._getHook = function(name) {
  return this._hooks[name];
};

MigrationTest.prototype._hasHook = function(name) {
  return Object.keys(this._hooks).indexOf(name) > -1;
};

MigrationTest.prototype._addHook = function(name, callback) {
  if (this._hasHook(name)) {
    return this.expect.fail('a ' + name + ' hook has already been registered');
  }
  if (typeof callback !== 'function') {
    return this.expect.fail('the ' + name + ' hook must be a function');
  }
  this._hooks[name] = callback;
};

MigrationTest.prototype._runHook = function(name) {
  return this.expect.promise(
    function() {
      if (this._hasHook(name)) {
        return this._getHook(name).call(this, this.knex, this.expect);
      }
    }.bind(this)
  );
};

MigrationTest.prototype.beforeUp = function(callback) {
  this._addHook('beforeUp', callback);
};

MigrationTest.prototype.testUp = function(callback) {
  this._addHook('testUp', callback);
};

MigrationTest.prototype.beforeDown = function(callback) {
  this._addHook('beforeDown', callback);
};

MigrationTest.prototype.testDown = function(callback) {
  this._addHook('testDown', callback);
};

MigrationTest.prototype.after = function(callback) {
  this._addHook('after', callback);
};

function init(expect) {
  expect.output.preferredWidth = 80;

  expect.addType({
    name: 'knex',
    base: 'object',
    identify: function(instance) {
      return (
        typeof instance === 'function' && instance.client instanceof Knex.Client
      );
    },
    inspect: function(value, depth, output, inspect) {
      output
        .jsFunctionName('knex')
        .text('(')
        .appendInspected(value.client.config)
        .text(')');
    }
  });

  expect.addAssertion('<knex> [not] to have table <string>', function(
    expect,
    knex,
    table
  ) {
    let schema;
    const dotIndex = table.indexOf('.');

    if (dotIndex < 0) {
      schema = knex.schema;
    } else {
      schema = knex.schema.withSchema(table.slice(0, dotIndex));
      table = table.slice(dotIndex + 1);
    }

    return expect(
      schema.hasTable(table),
      'to be fulfilled with',
      !expect.flags.not
    );
  });

  expect.addAssertion('<knex> [not] to have column <object>', function(
    expect,
    knex,
    columnDefinition
  ) {
    var valueType = expect.argTypes[0];
    var tableNames = valueType.getKeys(columnDefinition);

    if (tableNames.length > 1) {
      expect.errorMode = 'nested';
      return expect.fail(
        'Provide a single column in the form: { tableName: columnName }'
      );
    }

    var tableName = tableNames[0];
    var columnName = columnDefinition[tableName];
    return expect(
      knex.schema.hasColumn(tableName, columnName),
      'to be fulfilled with',
      !expect.flags.not
    );
  });

  expect.addAssertion('<knex> [not] to have columns <object>', function(
    expect,
    knex,
    columnDefinition
  ) {
    expect.errorMode = 'nested';
    var tableNames = Object.keys(columnDefinition);
    var assertions = tableNames.reduce(function(assertions, tableName) {
      var columnNames = columnDefinition[tableName];
      if (!Array.isArray(columnNames)) {
        columnNames = [columnNames];
      }
      return assertions.concat(
        columnNames.map(function(columnName) {
          var column = {};
          column[tableName] = columnName;
          return expect(knex, '[not] to have column', column);
        })
      );
    }, []);
    return expect.promise.all(assertions);
  });

  expect.addAssertion('<knex> with table <string> <assertion?>', function(
    expect,
    knex,
    table
  ) {
    expect.errorMode = 'bubble';
    return expect.shift(knex(table));
  });

  expect.addType({
    name: 'knexQuery',
    base: 'object',
    identify: function(value) {
      return value instanceof QueryBuilder;
    },
    inspect: function(value, depth, output, inspect) {
      output.appendInspected(value.toQuery());
    }
  });

  expect.addAssertion(
    [
      '<knexQuery> to have rows [exhaustively] satisfying <array>',
      '<knexQuery> to have rows [exhaustively] satisfying <expect.it>',
      '<knexQuery> to have rows [exhaustively] satisfying <function>'
    ],
    function(expect, query, value) {
      return expect(
        query.select(),
        'to be fulfilled with value [exhaustively] satisfying',
        value
      );
    }
  );

  expect.addAssertion('<knexQuery> [not] to be empty', function(expect, query) {
    return query.select().then(function(rows) {
      expect(rows, '[not] to be empty');
    });
  });

  expect.addAssertion(
    '<knexQuery> to have a row [exhaustively] satisfying <object>',
    function(expect, query, value) {
      if (Object.keys(value).length < 1) {
        expect.errorMode = 'nested';
        return expect.fail('cannot assert that a row has no columns or fields');
      }
      return expect(
        query,
        'to have rows satisfying',
        expect.it('to have an item [exhaustively] satisfying', value)
      );
    }
  );

  const ascendingOrder = (a, b) => parseInt(a.id) - parseInt(b.id);

  expect.addAssertion(
    '<knexQuery> to have sorted rows [exhaustively] satisfying <array>',
    (expect, subject, value) => {
      const exhaustive = expect.flags.exhaustively;
      return expect(
        subject,
        'to have rows satisfying',
        expect.it(
          'sorted by',
          ascendingOrder,
          exhaustive ? 'to exhaustively satisfy' : 'to satisfy',
          value
        )
      );
    }
  );

  expect.addAssertion(
    '<Promise> to be fulfilled with sorted rows [exhaustively] satisfying <array>',
    (expect, subject, value) => {
      const exhaustive = expect.flags.exhaustively;
      return expect(
        subject,
        'to be fulfilled with value satisfying',
        expect.it(
          'sorted by',
          ascendingOrder,
          exhaustive ? 'to exhaustively satisfy' : 'to satisfy',
          value
        )
      );
    }
  );

  expect.addAssertion('<knex> to apply migration <string>', function(
    expect,
    knex,
    filename
  ) {
    expect.errorMode = 'nested';

    if (!filename) {
      return expect.fail('the filename cannot be an empty string');
    }

    function fail(message, error) {
      return expect.fail({
        output: function(output) {
          output
            .error(message)
            .error(': ')
            .appendErrorMessage(error);
        },
        originalError: error
      });
    }

    unexpectedKnexMigratorFilename = filename;
    var migrator = new UnexpectedKnexMigrator(knex);
    var migration;
    try {
      var directory = migrator._absoluteConfigDir();
      migration = require(path.resolve(directory, filename));
    } catch (e) {
      return fail('cannot load migration', e);
    }

    var test = new MigrationTest(knex, expect);
    if (typeof migration.test === 'function') {
      migration.test.call(test);
    }

    function migrateUp() {
      return migrator.latest();
    }

    function migrateDown() {
      return migrator.rollback();
    }

    return test
      ._runHook('beforeUp')
      .catch(function(e) {
        return fail('beforeUp failed with', e);
      })
      .then(function() {
        return migrateUp().catch(function(e) {
          return fail('up migration failed with', e);
        });
      })
      .then(function() {
        return test._runHook('testUp').catch(function(e) {
          return fail('testUp failed with', e);
        });
      })
      .then(function() {
        return test._runHook('beforeDown').catch(function(e) {
          return fail('beforeDown failed with', e);
        });
      })
      .then(function() {
        return migrateDown().catch(function(e) {
          return fail('down migration failed with', e);
        });
      })
      .then(function() {
        return test._runHook('testDown').catch(function(e) {
          return fail('testDown failed with', e);
        });
      })
      .then(function() {
        return migrateUp().catch(function(e) {
          return fail('up migration after down migration failed with', e);
        });
      })
      .then(function() {
        return test._runHook('after').catch(function(e) {
          return fail('after failed with', e);
        });
      });
  });
}

module.exports = {
  name: 'unexpected-knex',
  installInto: init
};
