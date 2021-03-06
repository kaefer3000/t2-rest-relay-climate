# t2-rest-relay-climate
REST + Linked Data interface for a [Tessel 2](https://tessel.io/) with a [climate](https://tessel.io/modules#module-climate) and [relay module](https://tessel.io/modules#module-relay).
So this gives you REST + Linked Data access to a temperature sensor, a humidity sensor, and two power switches.

## Set-up recipe
* Require:
  * NodeJS
* Buy:
  * A [Tessel 2](https://tessel.io/)
  * A [climate module](https://tessel.io/modules#module-climate) and 
  * A [relay module](https://tessel.io/modules#module-relay).
* Plug:
  * The relay module to Tessel's port A, and 
  * The climate module to port B.
  * Attach something to the relay module (may require some wire cutting and soldering)
  * USB cable from your computer to the Tessel
* Install:
  * The Tessel CLI: `npm i -g t2-cli`
  * The dependencies from this repo: `npm i`
  * The code from this repo onto the Tessel: `t2 push .`
* Configure:
  * The network 
    * Connect the Tessel to your Ethernet or WiFi, then give the Tessel a certain IP or hostname, or
    * Make the Tessel open a WiFi access point, eg. `t2 wifi -n t2-rest-relay-climate` (add security, and enable the access point), and connect to the access point
  * The Tessel
    * Give the Tessel a name, eg. `t2 rename t2-rest-relay-climate` (the name is used, eg. if the Tessel's access point does DNS resolution, see below)
* Unplug the Tessel, give the Tessel USB power, and wait for it to boot.

## Implementation details
Serves RDF in RDF/XML, Turtle, JSON-LD, ... as Linked Data on a REST interface.
Built on the [Express](http://expressjs.com/) and [RDF-Ext](https://github.com/rdf-ext) frameworks.
Describes the [Tessel 2](http://tessel.io/) using the following vocabularies:
[SOSA/SSN](https://w3c.github.io/sdw/ssn/), [SAREF](http://ontology.tno.nl/saref/), [QUDT](http://qudt.org/), [FOAF](http://xmlns.com/foaf/) (see below).

## You can:
(The examples use `t2-rest-relay-climate.lan` as the Tessel's hostname)
### Access the root resource:
```sh
$ curl -Haccept:text/turtle http://t2-rest-relay-climate.lan/
```
yields:
```turtle
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix sosa: <http://www.w3.org/ns/sosa/> .

<#t2> 
    a sosa:Platform ;
    sosa:hosts <climate/#module>, <relay/#module>;
    foaf:isPrimaryTopicOf <>.

```
### Explore what is there following `ssn:hosts` links:
Find sensors and actuators, for instance:

### Access the temperature sensor:

```sh
$ curl -Haccept:text/turtle http://t2-rest-relay-climate.lan/climate/temperature 
```
yields:
```turtle
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix ssn: <http://www.w3.org/ns/ssn/> .
@prefix qudt: <http://qudt.org/schema/qudt/> .
@prefix saref: <https://w3id.org/saref#> .

<#sensor>
    a saref:TemperatureSensor ;
    ssn:hasProperty <#value> .

<#value>
    qudt:quantityValue [
        qudt:numericValue 27.88 ;
        qudt:unit <http://qudt.org/vocab/unit/DEG_C>
    ] ;
    foaf:isPrimaryTopicOf <> .
```
### Access one of the relays:
```sh
$ curl -Haccept:text/turtle http://t2-rest-relay-climate.lan/relay/1
```
yields:
```turtle
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix sosa: <http://www.w3.org/ns/sosa/> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix saref: <https://w3id.org/saref#> .

<#relay>
    a saref:Switch ;
    sosa:hasProperty <#state> .

<#state>
    a sosa:ActuatableProperty, sosa:ObservableProperty ;
    rdf:value saref:Off ;
    foaf:isPrimaryTopicOf <> .

```

### Turn on and off a relay:
````
$ curl -X PUT http://t2-rest-relay-climate.lan/relay/1 -Hcontent-type:text/turtle --data-binary " <http://tessel-ip-or-hostname/relay/1#state> <http://www.w3.org/1999/02/22-rdf-syntax-ns#value> <https://w3id.org/saref#Off> . "
````

## Status
First rough implementation.
