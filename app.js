/**
 * Copyright (c) 2014 TopCoder, Inc. All rights reserved.
 */
'use strict';

// New relic
if (process.env.NODE_ENV === 'production') {
  require('newrelic');
}

var a127 = require('a127-magic');
var express = require('express');
var config = require('config');
var datasource = require('./datasource');
var bodyParser = require('body-parser');
var lcHelper = require('lc-helper');
var tcAuth = require('tc-auth');

var app = express();

a127.init(function (swaggerConfig) {
  app.use(bodyParser.json());

// central point for all authentication
  tcAuth.auth(app, config);

// Serve the Swagger documents and Swagger UI
  if (config.has('app.loadDoc') && config.get('app.loadDoc')) {
    var swaggerTools = require('swagger-tools');
    var swaggerUi = swaggerTools.middleware.v2.swaggerUi;
    var yaml = require('js-yaml');
    var fs = require('fs');

    var swaggerDoc = yaml.safeLoad(fs.readFileSync('./api/swagger/swagger.yaml', 'utf8'));
    app.use(swaggerUi(swaggerDoc));
  }


// @TODO add try/catch logic
  datasource.init(config);

  var port;
  if (config.has('app.port')) {
    port = config.get('app.port');
  } else {
    port = 10010;
  }

  // a127 middlewares
  app.use(a127.middleware(swaggerConfig));

  // render response data as JSON
  app.use(lcHelper.middleware.renderJson);

  // generic error handler
  app.use(lcHelper.middleware.errorHandler);
  // app.use(errors.middleware.errorHandler);

  app.listen(port);
  console.log('app started at ' + port);
});

