'use strict'

module.exports = `

package pulsarcast;

message EventDescriptor {

  optional bytes publisher = 1;
  optional bytes payload = 2;
  optional bytes parent = 3;
  optional MetaData metadata = 4;

  message MetaData {
    optional string created = 1;
    optional string protocolVersion = 2;
  }

  message Topic {
    optional string name = 1;
    optional string link = 2;
  }
}`
