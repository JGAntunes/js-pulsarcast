'use strict'

module.exports = `

package pulsarcast;

message Link {
  optional bytes '/' = 1;
}

message TopicDescriptor {

  optional string name = 1;
  optional bytes author = 2;
  optional Link parent = 2;
  map<string, Link> # = 3;
  optional MetaData metadata = 4;

  message MetaData {
    optional string created = 1;
    optional string protocolVersion = 2;
  }
}

message EventDescriptor {

  message MetaData {
    optional string created = 1;
    optional string protocolVersion = 2;
  }

  optional bytes publisher = 1;
  optional Link topic = 2;
  optional bytes payload = 3;
  optional Link parent = 4;
  optional MetaData metadata = 5;
}

message PeerTree {
  optional bytes topic = 1;
  repeated bytes parents = 2;
  repeated bytes children = 3;
}

message RPC {
  enum Operation {
    PING = 0;
    UPDATE = 1;
    EVENT = 2;
    JOIN_TOPIC = 3;
    LEAVE_TOPIC = 4;
    NEW_TOPIC = 5;
  }

  message Message {
    optional Operation op = 1;
    oneof payload {
      TopicDescriptor topic = 2;
      EventDescriptor event = 3;
      PeerTree peerTree = 4;
      bytes topicId = 5;
    }
    optional MessageMetaData metadata = 6;
  }

  message MessageMetaData {
    optional string created = 1;
    optional string protocolVersion = 2;
  }

  repeated Message msgs = 1;
}`
