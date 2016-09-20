var path = require('path');
var knexModule = require('knex');
var unexpectedFs = require('unexpected-fs');
var unexpectedRequire = require('unexpected-require');
var Migrate = require('knex/lib/migrate');
var QueryBuilder = require('knex/lib/query/builder');

function isKnex(instance) {
    return typeof instance === 'function' && instance.client instanceof knexModule.Client;
}

function isMigration(value) {
    return value &&
        typeof value.up === 'function' &&
        typeof value.down === 'function' &&
        typeof value.name === 'string' && value.name;
}

module.exports = function (knex) {
    if (!knex) {
        throw new Error('No knex instance provided');
    }

    if (!isKnex(knex)) {
        throw new Error('Invalid knex instance provided');
    }

    return {
        name: 'unexpected-knex',
        installInto: function (expect) {
            expect.use(unexpectedFs);
            expect.use(unexpectedRequire);

            expect.addType({
                name: 'knex',
                base: 'object',
                identify: isKnex,
                inspect: function (value, depth, output, inspect) {
                    output.appendInspected('knex');
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
                '<knex> with table <string> <assertion>',
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

            expect.addType({
                name: 'migration',
                base: 'object',
                identify: isMigration,
                inspect: function (value, depth, output, inspect) {
                    output.appendInspected(value.name);
                }
            });

            var migrate = new Migrate(knex);

            function migrateUp() {
                return migrate.latest();
            }

            function migrateDown() {
                return migrate.rollback();
            }

            expect.addType({
                name: 'migrations',
                base: 'object',
                identify: function (value) {
                    if (!value || typeof value !== 'object') {
                        return false;
                    }
                    var keys = Object.keys(value);
                    if (!keys.length) {
                        return false;
                    }
                    return keys.every(function (key) {
                        var migration = value[key];
                        return isMigration(migration) && migration.name === key;
                    });
                },
                inspect: function (value, depth, output, inspect) {
                    output.appendInspected(Object.keys(value));
                }
            });

            var migrationsDir = knex.client.config.migrations &&
                knex.client.config.migrations.directory || './migrations';

            expect.addAssertion('<migrations> to apply', function (expect, migrations) {
                var mockFs = {};
                mockFs[migrationsDir] = {};

                var filenames = Object.keys(migrations);
                return expect.promise.all(filenames.map(function (filename) {
                    var migration = migrations[filename];

                    mockFs[migrationsDir][filename] = '';

                    var mockRequire = {};
                    var absolutePath = path.resolve(migrationsDir, filename);
                    mockRequire[absolutePath] = migrations[filename];

                    return expect(
                        migration,
                        'with fs mocked out', mockFs,
                        'with require mocked out', mockRequire,
                        'to apply'
                    );
                }));
            });

            expect.addAssertion('<migration> to apply', function (expect, migration) {
                function fail(message, error) {
                    expect.fail({
                        output: function (output) {
                            output.error(message)
                                .error(': ')
                                .appendErrorMessage(error);
                        },
                        originalError: error
                    });
                }

                expect.errorMode = 'bubble';
                return expect.promise(function () {
                    if (migration.test && migration.test.beforeUp) {
                        return migration.test.beforeUp.call(this, knex)
                            .catch(function (e) {
                                fail('before-up hook failed with', e);
                            });
                    }
                }).then(function () {
                    return migrateUp().catch(function (e) {
                        fail('up migration failed with', e);
                    });
                }).then(function () {
                    if (migration.test && migration.test.up) {
                        return migration.test.up.call(this, expect, knex)
                            .catch(function (e) {
                                fail('test for up migration failed with', e);
                            });
                    }
                }).then(function () {
                    if (migration.test && migration.test.beforeDown) {
                        return migration.test.beforeDown.call(this, knex)
                            .catch(function (e) {
                                fail('before-down hook failed with', e);
                            });
                    }
                }).then(function () {
                    return migrateDown().catch(function (e) {
                        fail('down migration failed with', e);
                    });
                }).then(function () {
                    if (migration.test && migration.test.down) {
                        return migration.test.down.call(this, expect, knex)
                            .catch(function (e) {
                                fail('test for down migration failed with', e);
                            });
                    }
                }).then(function () {
                    return migrateUp().catch(function (e) {
                        fail('up migration after down migration failed with', e);
                    });
                }).then(function () {
                    if (migration.test && migration.test.afterDown) {
                        return migration.test.afterDown.call(this, knex)
                            .catch(function (e) {
                                fail('after-down hook failed with', e);
                            });
                    }
                });
            });

            var incrementalMigrations = {};
            expect.addAssertion(
                '<string> to apply [incrementally]',
                function (expect, filename) {
                    expect.errorMode = 'bubble';
                    return expect.promise(function () {
                        var resolved = path.resolve(migrationsDir, filename);
                        var migration = require(resolved);

                        if (typeof migration.up !== 'function' ||
                            typeof migration.down !== 'function') {
                            throw new Error(filename + ' is not a migration');
                        }

                        migration.name = filename;

                        var migrations;
                        if (this.flags.incrementally) {
                            migrations = incrementalMigrations;
                        } else {
                            migrations = {};
                        }

                        migrations[filename] = migration;

                        return expect(migrations, 'to apply');
                    });
                }
            );
        }
    };
};
