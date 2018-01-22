# t2-rest-relay-climate
REST + Linked Data interface for a Tessel 2 with a [climate](https://tessel.io/modules#module-climate) and [relay module](https://tessel.io/modules#module-relay).

## Implementation details
Serves RDF in RDF/XML, Turtle, JSON-LD, ... as Linked Data on a REST interface.
Built on the [Express](http://expressjs.com/) and [RDF-Ext](https://github.com/rdf-ext) frameworks.
Describes the [Tessel 2](http://tessel.io/) using the following vocabularies:
[SOSA/SSN](https://w3c.github.io/sdw/ssn/) and [SAREF](http://ontology.tno.nl/saref/). 
Assumes the relay module connected to Tessel's port A, and the climate module to port B.

## You can:
Access the root resource like:
````
$ curl http://tessel-ip-or-hostname/
````
Follow `ssn:hosts` links to the sensors and actuators.

Turn on and off the relays:
````
$ curl -X PUT http://tessel-ip-or-hostname/relay/1 -Hcontent-type:text/turtle --data-binary " <http://tessel-ip-or-hostname/relay/1#state> <http://www.w3.org/1999/02/22-rdf-syntax-ns#value> <https://w3id.org/saref#Off> . "
````

## Status
First rough implementation.
