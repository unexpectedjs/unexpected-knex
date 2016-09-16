var fs = require('fs');
var knexModule = require('knex');

module.exports = function (config) {
    if (!config) {
        throw new Error(
            'Please provide a config ({ knex, migrationsDir }) object'
        );
    }

    var knex = config.knex;
    if (!knex) {
        throw new Error('Please provide a knex instance (config.knex)');
    }
    if (typeof knex !== 'function' ||
        !(knex.client instanceof knexModule.Client)) {
        throw new Error('Please provide a valid knex instance');
    }

    var migrationsDir = config.migrationsDir;
    if (!migrationsDir) {
        throw new Error(
            'Please provide a path to the migrations directory (config.migrationsDir)'
        );
    }
    if (typeof migrationsDir !== 'string') {
        throw new Error(
            'Please provide a valid path to the migrations directory'
        );
    }

    var migrationFiles = fs.readdirSync(migrationsDir);

    return {
        migrationFiles: migrationFiles
    };
};
