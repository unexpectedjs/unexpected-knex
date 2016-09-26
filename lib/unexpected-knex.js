var util = require('util');
var path = require('path');
var knexModule = require('knex');
var unexpectedFs = require('unexpected-fs');
var unexpectedRequire = require('unexpected-require');
var KnexMigrator = require('knex/lib/migrate');
var QueryBuilder = require('knex/lib/query/builder');

function UnexpectedKnexMigrator(knex, filename) {
    this.unexpectedKnexFilename = filename;
    KnexMigrator.call(this, knex);
}
util.inherits(UnexpectedKnexMigrator, KnexMigrator);

function getFilenamesBefore(filename, filenames) {
    return filenames.slice(0, filenames.indexOf(filename) + 1);
}

UnexpectedKnexMigrator.prototype._listAll = function () {
    return KnexMigrator.prototype._listAll.call(this, arguments).then(function (filenames) {
        return getFilenamesBefore(this.unexpectedKnexFilename, filenames || []);
    }.bind(this));
};

UnexpectedKnexMigrator.prototype._listCompleted = function () {
    return KnexMigrator.prototype._listCompleted.call(this, arguments).then(function (filenames) {
        return getFilenamesBefore(this.unexpectedKnexFilename, filenames || []);
    }.bind(this));
};

function init(expect) {
    expect.use(unexpectedFs);
    expect.use(unexpectedRequire);

    expect.addType({
        name: 'knex',
        base: 'object',
        identify: function (instance) {
            return typeof instance === 'function' &&
                   instance.client instanceof knexModule.Client;
        },
        inspect: function (value, depth, output, inspect) {
            output.jsFunctionName('knex')
                  .text('(')
                  .appendInspected(value.client.config)
                  .text(')');
        }
    });

    expect.addAssertion(
        '<knex> [not] to have table <string>',
        function (expect, knex, table) {
            return expect(
                knex.schema.hasTable(table),
                'to be fulfilled with',
                !expect.flags.not
            );
        }
    );

    expect.addAssertion(
        '<knex> [not] to have column <object>',
        function (expect, knex, columnDefinition) {
            var valueType = expect.argTypes[0];
            var keys = valueType.getKeys(columnDefinition);

            if (keys.length > 1) {
                return expect.fail(
                    'Specify a single column in the form: { tableName: columnName }'
                );
            }

            var tableName = keys[0];
            var columnName = columnDefinition[tableName];
            return expect(
                knex.schema.hasColumn(tableName, columnName),
                'to be fulfilled with',
                !expect.flags.not
            );
        }
    );

    expect.addAssertion(
        '<knex> [not] to have columns <object>',
        function (expect, knex, columnDefinition) {
            var valueType = expect.argTypes[0];
            var keys = valueType.getKeys(columnDefinition);
            if (keys.length > 1) {
                return expect.fail(
                    'Specify columns in the form: { tableName: [columnNames] }'
                );
            }
            var tableName = keys[0];
            var columnNames = columnDefinition[tableName];
            return expect.promise.all(columnNames.map(
                function (columnName) {
                    var column = {};
                    column[tableName] = columnName;
                    return expect(knex, '[not] to have column', column);
                }
            ));
        }
    );

    expect.addAssertion(
        '<knex> with table <string> <assertion?>',
        function (expect, knex, table) {
            expect.shift(knex(table));
        }
    );

    expect.addType({
        name: 'knexQuery',
        base: 'object',
        identify: function (value) {
            return value instanceof QueryBuilder;
        },
        inspect: function (value, depth, output, inspect) {
            output.appendInspected(value.toQuery());
        }
    });

    expect.addAssertion(
        '<knexQuery> to satisfy <array|expect.it>',
        function (expect, query, value) {
            return expect(query.select(), 'to be fulfilled with', value);
        }
    );

    expect.addAssertion(
        '<knexQuery> to satisfy <object>',
        function (expect, query, value) {
            return expect(query, 'to satisfy', [value]);
        }
    );

    expect.addAssertion(
        '<knex> to apply migration <string>',
        function (expect, knex, filename) {
            expect.errorMode = 'nested';

            if (!filename) {
                return expect.fail('Please provide a filename');
            }

            var migrator = new UnexpectedKnexMigrator(knex, filename);
            var directory = migrator._absoluteConfigDir();
            var absoluteFilename = path.resolve(directory, filename);

            function fail(message, error) {
                return expect.fail({
                    output: function (output) {
                        output.nl()
                              .error(message)
                              .error(': ')
                              .appendErrorMessage(error);
                    },
                    originalError: error
                });
            }

            var migration;
            try {
                migration = require(absoluteFilename);
            } catch (e) {
                return fail('cannot load migration', e);
            }

            function migrateUp(knex) {
                return migrator.latest();
            }

            function migrateDown(knex) {
                return migrator.rollback();
            }

            return expect.promise(function () {
                if (migration.test && migration.test.beforeUp) {
                    return migration.test.beforeUp.call(this, knex)
                        .catch(function (e) {
                            return fail('beforeUp failed with', e);
                        });
                }
            }).then(function () {
                return migrateUp().catch(function (e) {
                    return fail('up migration failed with', e);
                });
            }).then(function () {
                if (migration.test && migration.test.testUp) {
                    return migration.test.testUp.call(this, expect, knex)
                        .catch(function (e) {
                            return fail('testUp failed with', e);
                        });
                }
            }).then(function () {
                if (migration.test && migration.test.beforeDown) {
                    return migration.test.beforeDown.call(this, knex)
                        .catch(function (e) {
                            return fail('beforeDown failed with', e);
                        });
                }
            }).then(function () {
                return migrateDown().catch(function (e) {
                    return fail('down migration failed with', e);
                });
            }).then(function () {
                if (migration.test && migration.test.testDown) {
                    return migration.test.testDown.call(this, expect, knex)
                        .catch(function (e) {
                            return fail('testDown failed with', e);
                        });
                }
            }).then(function () {
                return migrateUp().catch(function (e) {
                    return fail('up migration after down migration failed with', e);
                });
            }).then(function () {
                if (migration.test && migration.test.afterDown) {
                    return migration.test.afterDown.call(this, knex)
                        .catch(function (e) {
                            return fail('afterDown failed with', e);
                        });
                }
            });
        }
    );
}

module.exports = {
    name: 'unexpected-knex',
    installInto: init
};
