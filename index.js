//
// Serves the climate module on HTTP.
//
// Author: kaefer3000
//

// Import the interface to Tessel hardware
var tessel = require('tessel');
// Load the interface to the climate sensor
var climatelib = require('climate-si7020');
// Load the web framework
var express = require('express');
// Load the logger for the web framework
var logger = require('morgan');
// Load RDF
var rdf = require('rdf-ext')
// Load the RDF parsers for HTTP messages
var rdfBodyParser = require('rdf-body-parser');
var RdfXmlSerializer = require('rdf-serializer-rdfxml');

// The root app
app = express();

// Preparing to use my rdf/xml serialiser
var formatparams = {};
formatparams.serializers = new rdf.Serializers();
formatparams.serializers['application/rdf+xml'] = RdfXmlSerializer;
var formats = require('rdf-formats-common')(formatparams);

var configuredBodyParser = rdfBodyParser({'defaultMediaType' : 'text/turtle', 'formats' : formats});

app.use(configuredBodyParser);

var climate = climatelib.use(tessel.port['B']);

// The two routers for the sensors/actuators
var climateApp = express.Router({ 'strict' : true }); // strict routing, ie. make a difference between URIs (not) ending in slash
climateApp.use(configuredBodyParser);

// configuring the app
app.set('case sensitive routing', true);
app.set('strict routing', true);
app.use(logger('dev'));

// defining a utility method that redirects (301) missing trailing slashes
var redirectMissingTrailingSlash = function(request, response, next) {
  if (!request.originalUrl.endsWith('/'))
    response.redirect(301, request.originalUrl + '/');
  else
    next();
};

// wiring the apps and routers
app.use("/climate", climateApp);

// description of the root app
var rootRdfGraph = rdf.createGraph();
rootRdfGraph.addAll(
  [
    new rdf.Triple(
      new rdf.NamedNode('#t2'),
      new rdf.NamedNode('http://xmlns.com/foaf/0.1/isPrimaryTopicOf'),
      new rdf.NamedNode('')),
    new rdf.Triple(
      new rdf.NamedNode('#t2'),
      new rdf.NamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      new rdf.NamedNode('http://www.w3.org/ns/sosa/Platform')),
    new rdf.Triple(
      new rdf.NamedNode('#t2'),
      new rdf.NamedNode('http://www.w3.org/ns/sosa/hosts'),
      new rdf.NamedNode('climate/#module'))
  ])

app.all('/', redirectMissingTrailingSlash);
app.get('/', function(request, response) {
  response.sendGraph(rootRdfGraph);
});

var climateAppModuleBaseGraph = rdf.createGraph();
climateAppModuleBaseGraph.addAll(
  [
    new rdf.Triple(
      new rdf.NamedNode('#value'),
      new rdf.NamedNode('http://xmlns.com/foaf/0.1/isPrimaryTopicOf'),
      new rdf.NamedNode('')),
   new rdf.Triple(
      new rdf.NamedNode('#sensor'),
      new rdf.NamedNode('http://www.w3.org/ns/ssn/hasProperty'),
      new rdf.NamedNode('#value'))
  ]
);
var climateAppTemperatureBaseGraph = climateAppModuleBaseGraph.merge(
  [
    new rdf.Triple(
      new rdf.NamedNode('#sensor'),
      new rdf.NamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      new rdf.NamedNode('https://w3id.org/saref#TemperatureSensor'))
  ]
);
// describing the temperature sensor
climateApp.route("/temperature").get(function (request, response) {

  climate.readTemperature(
    function (err, data) {
      if (err) {
        response.status(500);
        response.send(err);
        return;
      } else {
        var bn = new rdf.BlankNode()
        console.log(bn)
        response.sendGraph(
          climateAppTemperatureBaseGraph.merge(
            [
              new rdf.Triple(
                new rdf.NamedNode('#value'),
                new rdf.NamedNode('http://qudt.org/schema/qudt/quantityValue'),
                bn),
              new rdf.Triple(
                bn,
                new rdf.NamedNode('http://qudt.org/schema/qudt/numericValue'),
                new rdf.Literal(data.toFixed(2), null, new rdf.NamedNode("http://www.w3.org/2001/XMLSchema#double"))),
              new rdf.Triple(
                bn,
                new rdf.NamedNode('http://qudt.org/schema/qudt/unit'),
                new rdf.NamedNode('http://qudt.org/vocab/unit/DEG_C'))
            ]
          )
        );
      }
    }
  );

});

var climateAppHumidityBaseGraph = climateAppModuleBaseGraph.merge(
  [
    new rdf.Triple(
      new rdf.NamedNode('#sensor'),
      new rdf.NamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      new rdf.NamedNode('https://w3id.org/saref#Sensor')),
    new rdf.Triple(
      new rdf.NamedNode('#sensor'),
      new rdf.NamedNode('https://w3id.org/saref#measuresProperty'),
      new rdf.NamedNode('#value')),
    new rdf.Triple(
      new rdf.NamedNode('#value'),
      new rdf.NamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      new rdf.NamedNode('https://w3id.org/saref#Humidity'))
  ]
);
// describing the humidity sensor
climateApp.route('/humidity').get(function (request, response) {

  climate.readHumidity(
    function (err, data) {
      if (err) {
        response.status(500);
        response.send(err);
        return;
      } else {
        response.sendGraph(
          climateAppHumidityBaseGraph.merge(
            [
              new rdf.Triple(
                new rdf.NamedNode('#value'),
                new rdf.NamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#value'),
                new rdf.Literal((data/100).toFixed(4), null, new rdf.NamedNode("http://www.w3.org/2001/XMLSchema#double")))
            ]
          )
        );
      }
    }
  );

});

var climateAppBaseGraph = rdf.createGraph();
climateAppBaseGraph.addAll(
  [
    new rdf.Triple(
      new rdf.NamedNode('#module'),
      new rdf.NamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      new rdf.NamedNode('http://www.w3.org/ns/sosa/Platform')),
    new rdf.Triple(
      new rdf.NamedNode('#module'),
      new rdf.NamedNode('http://xmlns.com/foaf/0.1/isPrimaryTopicOf'),
      new rdf.NamedNode(''))
  ]
);

// description of the sensors of the climate module
climateApp.route('/').all(redirectMissingTrailingSlash);
climateApp.route('/').get(function(request, response) {

  var ret = climateAppBaseGraph.clone()
  if (climateApp.stack)
    climateApp.stack.forEach(function(blubb){
        if (blubb.route.path)
          if (blubb.route.path.startsWith('/') && blubb.route.path.length > 1) {
            ret.add(
              new rdf.Triple(
                new rdf.NamedNode('#module'),
                new rdf.NamedNode('http://www.w3.org/ns/sosa/hosts'),
                new rdf.NamedNode(blubb.route.path.substring(1) + "#sensor"))
            )
          }
    });
  response.sendGraph(ret);
});

// Startup the server
var port = 80;
app.listen(port, function () {
  console.log('App listening on port ' + port);
});

// For finding the server in the network, some handy output on the console
console.log(require('os').networkInterfaces());

climate.on('error', function(err) {
  console.log('error connecting module', err);
});

