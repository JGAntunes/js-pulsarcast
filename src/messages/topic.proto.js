'use strict'

module.exports = `
message TopicDescriptor {
  optional string name = 1;
  optional MetaData metadata = 2;
  optional EncOpts enc = 2;
  message MetaData {
  }
}`
