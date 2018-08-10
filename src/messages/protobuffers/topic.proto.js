'use strict'

module.exports = `

package pulsarcast;

message TopicDescriptor {

  optional string name = 1;
  optional bytes parent = 2;
  map<string, bytes> # = 3;
  optional MetaData metadata = 4;

  message MetaData {
    optional string created = 1;
    optional string protocolVersion = 2;
  }
}`
