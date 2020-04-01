/**
 * Copyright 2013-2017 the original author or authors from the JHipster project.
 *
 * This file is part of the JHipster project, see http://www.jhipster.tech/
 * for more information.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/* eslint-disable consistent-return */
const chalk = require('chalk');
const EntityGenerator = require('generator-jhipster/generators/entity');
const constants = require('generator-jhipster/generators/generator-constants');
const _ = require('lodash');
const shelljs = require('shelljs');
const jhiCore = require('jhipster-core');
const prompts = require('./prompts');

const ANGULAR = 'angularX';

const getNewElements = (currentElements, previousElements) => {
    console.log({ currentElements });
    return currentElements.filter(
        currentElement => !previousElements.find(previousElement => JSON.stringify(previousElement) === JSON.stringify(currentElement))
    );
};

const getRemovedElements = (currentElements, previousElements) => {
    return previousElements.filter(
        previousElement => !currentElements.find(currentElement => JSON.stringify(currentElement) === JSON.stringify(previousElement))
    );
};

/**
 * Load an entity configuration file into context.
 */
const loadEntityJsonWithPrevious = (obj, fromPath, fromPathPreviousState = null) => {
    const context = obj.context;
    try {
        context.fileData = obj.fs.readJSON(fromPath);
    } catch (err) {
        this.debug('Error:', err);
        this.error('\nThe entity configuration file could not be read!\n');
    }
    if (context.fileData.databaseType) {
        context.databaseType = context.fileData.databaseType;
    }

    try {
        if (fromPathPreviousState) {
            context.previousStateFileData = obj.fs.readJSON(fromPathPreviousState);
        }
    } catch (err) {
        this.debug('Error:', err);
        this.error('\nThe entity configuration file for previous entity state could not be read!\n');
    }

    context.relationships = context.fileData.relationships || [];
    context.fields = context.fileData.fields || [];

    if (context.previousStateFileData && context.previousStateFileData.fields && context.previousStateFileData.fields.length > 0) {
        context.newFields = getNewElements(context.fields, context.previousStateFileData.fields);
        context.removedFields = getRemovedElements(context.fields, context.previousStateFileData.fields);

        console.log(context.newFields);
        console.log(context.removedFields);

        if ((context.newFields && context.newFields.length > 0) || (context.removedFields && context.removedFields.length > 0)) {
            context.newChangelog = true;
        }
    } else {
        context.newFields = [];
        context.removedFields = [];
    }

    if (
        context.previousStateFileData &&
        context.previousStateFileData.relationships &&
        context.previousStateFileData.relationships.length > 0
    ) {
        context.newRelationships = getNewElements(context.fileData.relationships, context.previousStateFileData.relationships);
        context.removedRelationships = getRemovedElements(context.fileData.relationships, context.previousStateFileData.relationships);

        if (
            (context.newRelationships && context.newRelationships.length > 0) ||
            (context.removedRelationships && context.removedRelationships.length > 0)
        ) {
            context.newChangelog = true;
        }
    } else {
        context.newRelationships = [];
        context.removedRelationships = [];
    }

    context.haveFieldWithJavadoc = false;
    context.fields.forEach(field => {
        if (field.javadoc) {
            context.haveFieldWithJavadoc = true;
        }
    });
    context.changelogDate = context.fileData.changelogDate;
    context.newChangelogDate = obj.dateFormatForLiquibase();
    context.dto = context.fileData.dto;
    context.service = context.fileData.service;
    context.fluentMethods = context.fileData.fluentMethods;
    context.clientRootFolder = context.fileData.clientRootFolder;
    context.pagination = context.fileData.pagination;
    context.searchEngine = _.isUndefined(context.fileData.searchEngine) ? context.searchEngine : context.fileData.searchEngine;
    context.javadoc = context.fileData.javadoc;
    context.entityTableName = context.fileData.entityTableName;
    context.jhiPrefix = context.fileData.jhiPrefix || context.jhiPrefix;
    context.skipCheckLengthOfIdentifier = context.fileData.skipCheckLengthOfIdentifier || context.skipCheckLengthOfIdentifier;
    context.jhiTablePrefix = obj.getTableName(context.jhiPrefix);
    context.skipClient = context.fileData.skipClient || context.skipClient;
    context.readOnly = context.fileData.readOnly || false;
    context.embedded = context.fileData.embedded || false;
    obj.copyFilteringFlag(context.fileData, context, context);
    if (_.isUndefined(context.entityTableName)) {
        obj.warning(`entityTableName is missing in .jhipster/${context.name}.json, using entity name as fallback`);
        context.entityTableName = obj.getTableName(context.name);
    }
    if (jhiCore.isReservedTableName(context.entityTableName, context.prodDatabaseType) && context.jhiPrefix) {
        context.entityTableName = `${context.jhiTablePrefix}_${context.entityTableName}`;
    }
    context.fields.forEach(field => {
        context.fieldNamesUnderscored.push(_.snakeCase(field.fieldName));
        context.fieldNameChoices.push({ name: field.fieldName, value: field.fieldName });
    });
    context.relationships.forEach(rel => {
        context.relNameChoices.push({
            name: `${rel.relationshipName}:${rel.relationshipType}`,
            value: `${rel.relationshipName}:${rel.relationshipType}`
        });
    });
    if (context.fileData.angularJSSuffix !== undefined) {
        context.entityAngularJSSuffix = context.fileData.angularJSSuffix;
    }
    context.useMicroserviceJson = context.useMicroserviceJson || !_.isUndefined(context.fileData.microserviceName);
    if (context.applicationType === 'gateway' && context.useMicroserviceJson) {
        context.microserviceName = context.fileData.microserviceName;
        if (!context.microserviceName) {
            obj.error('Microservice name for the entity is not found. Entity cannot be generated!');
        }
        context.microserviceAppName = obj.getMicroserviceAppName(context.microserviceName);
        context.skipServer = true;
    }
};

module.exports = class extends EntityGenerator {
    constructor(args, opts) {
        super(args, Object.assign({ fromBlueprint: true }, opts)); // fromBlueprint variable is important

        const jhContext = (this.jhipsterContext = this.options.jhipsterContext);

        if (!jhContext) {
            this.error(
                `This is a JHipster blueprint and should be used only like ${chalk.yellow(
                    'jhipster --blueprint generator-jhipster-sample-blueprint'
                )}`
            );
        }

        this.configOptions = jhContext.configOptions || {};

        jhContext.setupEntityOptions(this, jhContext, this);
    }

    // Public API method used by the getter and also by Blueprints
    _initializing() {
        return {
            validateFromCli() {
                this.checkInvocationFromCLI();
            },



            getConfig() {
                const context = this.context;
                const configuration = this.getAllJhipsterConfig(this, true);
                context.useConfigurationFile = false;
                this.env.options.appPath = configuration.get('appPath') || constants.CLIENT_MAIN_SRC_DIR;
                context.options = this.options;
                context.baseName = configuration.get('baseName');
                context.capitalizedBaseName = _.upperFirst(context.baseName);
                context.packageName = configuration.get('packageName');
                context.applicationType = configuration.get('applicationType');
                context.reactive = configuration.get('reactive');
                context.packageFolder = configuration.get('packageFolder');
                context.authenticationType = configuration.get('authenticationType');
                context.cacheProvider = configuration.get('cacheProvider') || configuration.get('hibernateCache') || 'no';
                context.enableHibernateCache =
                    configuration.get('enableHibernateCache') && !['no', 'memcached'].includes(context.cacheProvider);
                context.websocket = configuration.get('websocket') === 'no' ? false : configuration.get('websocket');
                context.databaseType = configuration.get('databaseType') || this.getDBTypeFromDBValue(this.options.db);
                context.prodDatabaseType = configuration.get('prodDatabaseType') || this.options.db;
                context.devDatabaseType = configuration.get('devDatabaseType') || this.options.db;
                context.skipFakeData = configuration.get('skipFakeData');
                context.searchEngine = configuration.get('searchEngine');
                context.messageBroker = configuration.get('messageBroker') === 'no' ? false : configuration.get('messageBroker');
                context.enableTranslation = configuration.get('enableTranslation');
                context.nativeLanguage = configuration.get('nativeLanguage');
                context.languages = configuration.get('languages');
                context.buildTool = configuration.get('buildTool');
                context.jhiPrefix = configuration.get('jhiPrefix');
                context.skipCheckLengthOfIdentifier = configuration.get('skipCheckLengthOfIdentifier');
                context.jhiPrefixDashed = _.kebabCase(context.jhiPrefix);
                context.jhiTablePrefix = this.getTableName(context.jhiPrefix);
                context.testFrameworks = configuration.get('testFrameworks');
                // preserve old jhipsterVersion value for cleanup which occurs after new config is written into disk
                this.jhipsterOldVersion = configuration.get('jhipsterVersion');
                // backward compatibility on testing frameworks
                if (context.testFrameworks === undefined) {
                    context.testFrameworks = ['gatling'];
                }
                context.protractorTests = context.testFrameworks.includes('protractor');
                context.gatlingTests = context.testFrameworks.includes('gatling');
                context.cucumberTests = context.testFrameworks.includes('cucumber');

                context.clientFramework = configuration.get('clientFramework');
                if (!context.clientFramework) {
                    context.clientFramework = ANGULAR;
                }
                context.clientPackageManager = configuration.get('clientPackageManager');
                if (!context.clientPackageManager) {
                    if (context.useYarn) {
                        context.clientPackageManager = 'yarn';
                    } else {
                        context.clientPackageManager = 'npm';
                    }
                }

                context.skipClient =
                    context.applicationType === 'microservice' || this.options['skip-client'] || configuration.get('skipClient');
                context.skipServer = this.options['skip-server'] || configuration.get('skipServer');
                context.skipDbChangelog = this.options['skip-db-changelog'] || configuration.get('skipDbChangelog');

                context.angularAppName = this.getAngularAppName(context.baseName);
                context.angularXAppName = this.getAngularXAppName(context.baseName);
                context.jhipsterConfigDirectory = '.jhipster';
                context.mainClass = this.getMainClassName(context.baseName);
                context.microserviceAppName = '';

                if (context.applicationType === 'microservice') {
                    context.microserviceName = context.baseName;
                    if (!context.clientRootFolder) {
                        context.clientRootFolder = context.microserviceName;
                    }
                }
                context.filename = `${context.jhipsterConfigDirectory}/${context.entityNameCapitalized}.json`;
                if (shelljs.test('-f', context.filename)) {
                    this.log(chalk.green(`\nFound the ${context.filename} configuration file, entity can be automatically generated!\n`));
                    context.useConfigurationFile = true;
                }

                context.filenamePreviousState = `${context.jhipsterConfigDirectory}/${context.entityNameCapitalized}-previous.json`;
                if (shelljs.test('-f', context.filenamePreviousState)) {
                    this.log(
                        chalk.green(
                            `\nFound the ${
                                context.filenamePreviousState
                            } configuration file for previous entity state, entity can be automatically updated!\n`
                        )
                    );
                    context.useConfigurationFile = true;
                }

                context.entitySuffix = configuration.get('entitySuffix');
                if (_.isNil(context.entitySuffix)) {
                    context.entitySuffix = '';
                }

                context.dtoSuffix = configuration.get('dtoSuffix');
                if (_.isNil(context.dtoSuffix)) {
                    context.dtoSuffix = 'DTO';
                }

                if (context.entitySuffix === context.dtoSuffix) {
                    this.error('The entity cannot be generated as the entity suffix and DTO suffix are equals !');
                }

                context.newFields = [];
                context.removedFields = [];
                context.newRelationships = [];
                context.removedRelationships = [];
                context.newChangelogDate = this.dateFormatForLiquibase();

                context.CLIENT_MAIN_SRC_DIR = constants.CLIENT_MAIN_SRC_DIR;
            },

            validateMvcApp() {
                if (this.context.reactive) {
                    this.error(chalk.red("The entity generator doesn't support reactive apps at the moment"));
                }
            },

            validateDbExistence() {
                const context = this.context;
                if (
                    !context.databaseType ||
                    (context.databaseType === 'no' &&
                        !(
                            (context.authenticationType === 'uaa' || context.authenticationType === 'oauth2') &&
                            context.applicationType === 'gateway'
                        ))
                ) {
                    if (context.skipServer) {
                        this.error(
                            chalk.red(
                                'The entity cannot be generated as the database type is not known! Pass the --db <type> & --prod-db <db> flag in command line'
                            )
                        );
                    } else {
                        this.error('The entity cannot be generated as the application does not have a database configured!');
                    }
                }
            },

            validateEntityName() {
                const entityName = this.context.name;
                if (!/^([a-zA-Z0-9_]*)$/.test(entityName)) {
                    this.error('The entity name cannot contain special characters');
                } else if (/^[0-9].*$/.test(entityName)) {
                    this.error('The entity name cannot start with a number');
                } else if (entityName === '') {
                    this.error('The entity name cannot be empty');
                } else if (entityName.indexOf('Detail', entityName.length - 'Detail'.length) !== -1) {
                    this.error("The entity name cannot end with 'Detail'");
                } else if (!this.context.skipServer && jhiCore.isReservedClassName(entityName)) {
                    this.error('The entity name cannot contain a Java or JHipster reserved keyword');
                }
            },

            setupconsts() {
                const context = this.context;
                const entityName = context.name;
                // Specific Entity sub-generator constants
                if (!context.useConfigurationFile) {
                    // no file present, new entity creation
                    this.log(`\nThe entity ${entityName} is being created.\n`);
                    context.fields = [];
                    context.haveFieldWithJavadoc = false;
                    context.relationships = [];
                    context.pagination = 'no';
                    context.validation = false;
                    context.dto = 'no';
                    context.service = 'no';
                    context.jpaMetamodelFiltering = false;
                    context.readOnly = false;
                    context.embedded = false;
                } else {
                    // existing entity reading values from file
                    this.log(`\nThe entity ${entityName} is being updated.\n`);
                    console.log('test');
                    loadEntityJsonWithPrevious(this, context.filename, context.filenamePreviousState);
                }
            },

            validateTableName() {
                const context = this.context;
                const prodDatabaseType = context.prodDatabaseType;
                const entityTableName = context.entityTableName;
                const jhiTablePrefix = context.jhiTablePrefix;
                const skipCheckLengthOfIdentifier = context.skipCheckLengthOfIdentifier;
                const instructions = `You can specify a different table name in your JDL file or change it in .jhipster/${
                    context.name
                }.json file and then run again 'jhipster entity ${context.name}.'`;

                if (!/^([a-zA-Z0-9_]*)$/.test(entityTableName)) {
                    this.error(`The table name cannot contain special characters.\n${instructions}`);
                } else if (entityTableName === '') {
                    this.error('The table name cannot be empty');
                } else if (jhiCore.isReservedTableName(entityTableName, prodDatabaseType)) {
                    if (jhiTablePrefix) {
                        this.warning(
                            chalk.red(
                                `The table name cannot contain the '${entityTableName.toUpperCase()}' reserved keyword, so it will be prefixed with '${jhiTablePrefix}_'.\n${instructions}`
                            )
                        );
                        context.entityTableName = `${jhiTablePrefix}_${entityTableName}`;
                    } else {
                        this.warning(
                            chalk.red(
                                `The table name contain the '${entityTableName.toUpperCase()}' reserved keyword but you have defined an empty jhiPrefix so it won't be prefixed and thus the generated application might not work'.\n${instructions}`
                            )
                        );
                    }
                } else if (prodDatabaseType === 'oracle' && entityTableName.length > 26 && !skipCheckLengthOfIdentifier) {
                    this.error(`The table name is too long for Oracle, try a shorter name.\n${instructions}`);
                } else if (prodDatabaseType === 'oracle' && entityTableName.length > 14 && !skipCheckLengthOfIdentifier) {
                    this.warning(
                        `The table name is long for Oracle, long table names can cause issues when used to create constraint names and join table names.\n${instructions}`
                    );
                }
            }
        };
    }

    get initializing() {
        return this._initializing();
    }

    get prompting() {
        return {
            /* pre entity hook needs to be written here */
            askForMicroserviceJson: prompts.askForMicroserviceJson,
            /* ask question to user if s/he wants to update entity */
            askForUpdate: prompts.askForUpdate,
            askForFields: prompts.askForFields,
            askForFieldsToRemove: prompts.askForFieldsToRemove,
            askForRelationships: prompts.askForRelationships,
            askForRelationsToRemove: prompts.askForRelationsToRemove,
            askForTableName: prompts.askForTableName,
            askForService: prompts.askForService,
            askForDTO: prompts.askForDTO,
            askForFiltering: prompts.askForFiltering,
            askForReadOnly: prompts.askForReadOnly,
            askForPagination: prompts.askForPagination
        };
    }

    get configuring() {
        return super._configuring();
    }

    get writing() {
        return super._writing();
    }

    get install() {
        return super._install();
    }
};
