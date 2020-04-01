#!/usr/bin/env node
/**
 * Copyright 2013-2020 the original author or authors from the JHipster project.
 *
 * This file is part of the JHipster project, see https://www.jhipster.tech/
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
const semver = require('semver');
const packageJson = require('generator-jhipster/package.json');
const { logger } = require('generator-jhipster/cli/utils');

const currentNodeVersion = process.versions.node;
const minimumNodeVersion = packageJson.engines.node;

if (!semver.satisfies(currentNodeVersion, minimumNodeVersion)) {
    logger.fatal(
        `You are running Node version ${currentNodeVersion}\nJHipster requires Node version ${minimumNodeVersion}\nPlease update your version of Node.`
    );
}

requireCLI();

/*
 * Require cli.js giving priority to local version over global one if it exists.
 */
function requireCLI(preferLocal) {
    logger.info('Using JHipster customized version to manage to new changelogs');
    // eslint-disable-next-line global-require
    require('./cli');
}
