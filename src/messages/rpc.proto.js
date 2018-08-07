'use strict'

module.exports = `

package pulsarcast;

message RPC {
  enum Operation {
    PING = 0;
    UPDATE = 1;
    EVENT = 2;
    JOIN = 3;
    LEAVE = 4;
  }

  message EventDescriptor {
    
    message EventMetaData {
      optional string created = 1;
      optional string protocolVersion = 2;
    }

    optional bytes publisher = 1;
    optional bytes payload = 2;
    optional bytes parent = 3;
    optional EventMetaData metadata = 4;
  }

  message PeerTree {
    repeated bytes parents = 1;
    repeated bytes children = 2;
  }

  message Message {
    optional Operation op = 1;
    optional bytes topic = 2;
    optional EventDescriptor event = 3;
    optional PeerTree peerTree = 4;
    optional MessageMetaData metadata = 5;
  }

  message MessageMetaData {
    optional string created = 1;
    optional string protocolVersion = 2;
  }

  repeated Message msgs = 1;
}`
