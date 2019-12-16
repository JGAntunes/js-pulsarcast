/* eslint-env mocha */
/* eslint no-unused-expressions: 0 */
'use strict'

const chai = require('chai')
const expect = chai.expect
const { parallel } = require('async')
const PeerId = require('peer-id')

const TopicNode = require('../../src/dag/topic-node')

describe('Topic Node', () => {
  let peerId
  let topicCID

  before(done => {
    PeerId.create((err, newId) => {
      if (err) return done(err)
      peerId = newId
      // Get a topic cid
      const topic = new TopicNode('yolo', peerId)
      topic.getCID((err, cid) => {
        if (err) return done(err)
        topicCID = cid
        done()
      })
    })
  })

  it('topic with default options should remain the same after serialization', done => {
    const topic = new TopicNode('foobar', peerId)
    const deserializedTopic = TopicNode.deserialize(topic.serialize())
    expect(deserializedTopic.serialize()).to.deep.equal(topic.serialize())
    expect(deserializedTopic.getReadableFormat()).to.deep.equal(
      topic.getReadableFormat()
    )
    parallel(
      [cb => topic.getCID(cb), cb => deserializedTopic.getCID(cb)],
      (err, [cid1, cid2]) => {
        if (err) return done(err)

        expect(cid1.equals(cid2)).to.be.true
        done()
      }
    )
  })

  it('topic with allowed and request publisher options should remain the same after serialization', done => {
    const topic = new TopicNode('foobar', peerId, {
      metadata: {
        allowedPublishers: [peerId],
        requestToPublish: [peerId]
      }
    })
    const deserializedTopic = TopicNode.deserialize(topic.serialize())
    expect(deserializedTopic.serialize()).to.deep.equal(topic.serialize())
    expect(deserializedTopic.getReadableFormat()).to.deep.equal(
      topic.getReadableFormat()
    )
    expect(deserializedTopic.metadata.allowedPublishers).to.have.lengthOf(1)
    expect(deserializedTopic.metadata.requestToPublish).to.have.lengthOf(1)
    expect(deserializedTopic.metadata.allowedPublishers[0].isEqual(peerId)).to
      .be.true
    expect(deserializedTopic.metadata.requestToPublish[0].isEqual(peerId)).to.be
      .true
    parallel(
      [cb => topic.getCID(cb), cb => deserializedTopic.getCID(cb)],
      (err, [cid1, cid2]) => {
        if (err) return done(err)

        expect(cid1.equals(cid2)).to.be.true
        done()
      }
    )
  })

  it('topic with allowed and request publisher options set to false should remain the same after serialization', done => {
    const topic = new TopicNode('foobar', peerId, {
      metadata: {
        allowedPublishers: false,
        requestToPublish: false
      }
    })
    const deserializedTopic = TopicNode.deserialize(topic.serialize())
    expect(deserializedTopic.serialize()).to.deep.equal(topic.serialize())
    expect(deserializedTopic.getReadableFormat()).to.deep.equal(
      topic.getReadableFormat()
    )
    expect(deserializedTopic.metadata.allowedPublishers).to.be.false
    expect(deserializedTopic.metadata.requestToPublish).to.be.false
    parallel(
      [cb => topic.getCID(cb), cb => deserializedTopic.getCID(cb)],
      (err, [cid1, cid2]) => {
        if (err) return done(err)

        expect(cid1.equals(cid2)).to.be.true
        done()
      }
    )
  })

  it('topic with custom created date should remain the same after serialization', done => {
    const customDate = new Date('2010')
    const topic = new TopicNode('foobar', peerId, {
      metadata: {
        created: customDate
      }
    })
    const deserializedTopic = TopicNode.deserialize(topic.serialize())
    expect(deserializedTopic.serialize()).to.deep.equal(topic.serialize())
    expect(deserializedTopic.getReadableFormat()).to.deep.equal(
      topic.getReadableFormat()
    )
    expect(deserializedTopic.metadata.created).to.deep.equal(customDate)
    parallel(
      [cb => topic.getCID(cb), cb => deserializedTopic.getCID(cb)],
      (err, [cid1, cid2]) => {
        if (err) return done(err)

        expect(cid1.equals(cid2)).to.be.true
        done()
      }
    )
  })

  it('topic with custom event linking should remain the same after serialization', done => {
    const topic = new TopicNode('foobar', peerId, {
      metadata: {
        eventLinking: 'CUSTOM'
      }
    })
    const deserializedTopic = TopicNode.deserialize(topic.serialize())
    expect(deserializedTopic.serialize()).to.deep.equal(topic.serialize())
    expect(deserializedTopic.getReadableFormat()).to.deep.equal(
      topic.getReadableFormat()
    )
    expect(deserializedTopic.metadata.eventLinking).to.equal('CUSTOM')
    parallel(
      [cb => topic.getCID(cb), cb => deserializedTopic.getCID(cb)],
      (err, [cid1, cid2]) => {
        if (err) return done(err)

        expect(cid1.equals(cid2)).to.be.true
        done()
      }
    )
  })

  it('topic with sub topics and parent should remain the same after serialization', done => {
    const topic = new TopicNode('foobar', peerId, {
      subTopics: { yolo: topicCID },
      parent: topicCID
    })
    const deserializedTopic = TopicNode.deserialize(topic.serialize())
    expect(deserializedTopic.serialize()).to.deep.equal(topic.serialize())
    expect(deserializedTopic.getReadableFormat()).to.deep.equal(
      topic.getReadableFormat()
    )
    expect(deserializedTopic.parent.equals(topicCID)).to.be.true
    expect(deserializedTopic.subTopics.yolo.equals(topicCID)).to.be.true
    parallel(
      [cb => topic.getCID(cb), cb => deserializedTopic.getCID(cb)],
      (err, [cid1, cid2]) => {
        if (err) return done(err)

        expect(cid1.equals(cid2)).to.be.true
        done()
      }
    )
  })
})
