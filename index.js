//
// Serves the climate and the relay module on HTTP.
//
// Author: kaefer3000
//

// Import the interface to Tessel hardware
var tessel = require('tessel');
// Load the interface to the climate sensor
var climatelib = require('climate-si7020');
// Load the interface to the relay
var relaylib = require('relay-mono');
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

var relay   = relaylib.use(tessel.port['A']);  
var climate = climatelib.use(tessel.port['B']);

// The two routers for the sensors/actuators
var climateApp = express.Router({ 'strict' : true }); // strict routing, ie. make a difference between URIs (not) ending in slash
var relayApp   = express.Router({ 'strict' : true });
relayApp.use(configuredBodyParser);

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
app.use("/relay",   relayApp);

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
      new rdf.NamedNode('climate/#module')),
   new rdf.Triple(
      new rdf.NamedNode('#t2'),
      new rdf.NamedNode('http://www.w3.org/ns/sosa/hosts'),
      new rdf.NamedNode('relay/#module'))
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

// Now the relays...
var relayAppGraph = rdf.createGraph()
relayAppGraph.addAll(
  [
   new rdf.Triple(
      new rdf.NamedNode('#module'),
      new rdf.NamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      new rdf.NamedNode('http://www.w3.org/ns/sosa/Platform')),
    new rdf.Triple(
      new rdf.NamedNode('#module'),
      new rdf.NamedNode('http://xmlns.com/foaf/0.1/isPrimaryTopicOf'),
      new rdf.NamedNode('')),
    new rdf.Triple(
      new rdf.NamedNode('#module'),
      new rdf.NamedNode('http://www.w3.org/ns/sosa/hosts'),
      new rdf.NamedNode('1#relay')),
    new rdf.Triple(
      new rdf.NamedNode('#module'),
      new rdf.NamedNode('http://www.w3.org/ns/sosa/hosts'),
      new rdf.NamedNode('2#relay'))
  ]
);

// description of the the relay module
relayApp.route('/').all(redirectMissingTrailingSlash)
                   .get(function(request, response) {
  response.sendGraph(relayAppGraph)
});

var relayBaseGraph = rdf.createGraph()
relayBaseGraph.addAll([
  new rdf.Triple(
      new rdf.NamedNode('#relay'),
      new rdf.NamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      new rdf.NamedNode('https://w3id.org/saref#Switch')),
  new rdf.Triple(
      new rdf.NamedNode('#state'),
      new rdf.NamedNode('http://xmlns.com/foaf/0.1/isPrimaryTopicOf'),
      new rdf.NamedNode('')),
  new rdf.Triple(
      new rdf.NamedNode('#relay'),
      new rdf.NamedNode('http://www.w3.org/ns/sosa/hasProperty'),
      new rdf.NamedNode('#state')),
    new rdf.Triple(
      new rdf.NamedNode('#state'),
      new rdf.NamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      new rdf.NamedNode('http://www.w3.org/ns/sosa/ActuatableProperty')),
    new rdf.Triple(
      new rdf.NamedNode('#state'),
      new rdf.NamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      new rdf.NamedNode('http://www.w3.org/ns/sosa/ObservableProperty'))
]);
var onTriple = new rdf.Triple(
                      new rdf.NamedNode('#state'),
                      new rdf.NamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#value'),
                      new rdf.NamedNode('https://w3id.org/saref#On'));
var offTriple = new rdf.Triple(
                      new rdf.NamedNode('#state'),
                      new rdf.NamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#value'),
                      new rdf.NamedNode('https://w3id.org/saref#Off'));
// GETting the state of one switch
relayApp.route("/:id").get(function(request, response) {

  if (request.params.id == 1 || request.params.id == 2) {
    relay.getState(Number(request.params.id), function(err, state) {
      if (err) {
        response.status(500);
        response.send(err);
        return;
      }
      if (state) {
        response.sendGraph(relayBaseGraph.merge([onTriple]));
      } else {
        response.sendGraph(relayBaseGraph.merge([offTriple]));
      }
    });
  } else {
    response.sendStatus(404);
  };

});

// PUTting the state of one switch
relayApp.route("/:id").put(function(request, response) {

  if (request.params.id == 1 || request.params.id == 2) {
      var targetStateTripleCount = 0;
      var statetriple;
      request.graph.filter(
        function(triple) {
          return triple.predicate.nominalValue === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#value'
        }).forEach(function(triple) {
          ++targetStateTripleCount;
          statetriple = triple;
        })
      if (targetStateTripleCount === 0 || targetStateTripleCount > 1) {
          response.status(400);
          response.send('Please supply exactly one triple with desired state\n');
          return;
      }
      var targetState;

      if (statetriple.object.interfaceName === 'NamedNode') {
        switch (statetriple.object.nominalValue) {
          case "https://w3id.org/saref#On":
            targetState = true;
            break;
          case "https://w3id.org/saref#Off":
            targetState = false;
            break;
          default:
            response.status(400);
            response.send('Please supply a triple with saref:hasState as predicate and saref:Off or saref:On as object\n');
            return;
        }
      } else {
        response.status(400);
        response.send('Please supply a triple with saref:hasState as predicate and saref:Off or saref:On as object\n');
        return;
      }

      if (typeof targetState !== "boolean") {
        response.sendStatus(500);
      } else if (targetState !== relay.getState(Number(request.params.id))) {
        relay.setState(Number(request.params.id), targetState, function(err) {
          if (err) {
            response.status(500);
            response.send(err);
            return;
          }
        });
        response.sendStatus(204);
        return;
      }
      response.sendStatus(204);
      return;
  } else {
    response.sendStatus(404);
    return;
  }
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
relay.on('error', function(err) {
  console.log('error connecting module', err);
});
