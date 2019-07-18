/* eslint-env mocha */
/* eslint no-unused-expressions: 0 */
'use strict'

const chai = require('chai')
const expect = chai.expect
const { parallel } = require('async')

const Pulsarcast = require('../../src')
const TopicNode = require('../../src/dag/topic-node')
const EventNode = require('../../src/dag/event-node')
const { eventually, createNodes } = require('../utils')

describe('2 nodes', () => {
  let nodes
  let topic
  let topicCID

  before((done) => {
    createNodes(2, (err, p2pNodes) => {
      expect(err).not.to.exist
      nodes = p2pNodes.map((node) => new Pulsarcast(node))
      done()
    })
  })

  it('starts both nodes', (done) => {
    parallel([
      nodes[0].start.bind(nodes[0]),
      nodes[1].start.bind(nodes[1])
    ], (err) => {
      expect(err).to.not.exist
      expect(nodes[0].started).to.be.true
      expect(nodes[1].started).to.be.true
      done()
    })
  })

  it('creates a topic', (done) => {
    nodes[0].createTopic('test', (err, savedCID, topicNode) => {
      expect(err).to.not.exist
      expect(topicNode).to.be.an.instanceof(TopicNode)
      topicNode.getCID((err, cid) => {
        expect(err).to.not.exist
        const topicB58Str = cid.toBaseEncodedString()
        expect(cid.equals(savedCID)).to.be.true
        expect(nodes[0].subscriptions.size).to.equal(1)
        expect(nodes[0].subscriptions.has(topicB58Str)).to.be.true
        topic = topicNode
        topicCID = cid
        done()
      })
    })
  })

  it('subscribes to the previously created topic', (done) => {
    nodes[1].subscribe(topicCID.toBaseEncodedString(), (err, topicNode) => {
      expect(err).to.not.exist
      expect(topicNode).to.be.an.instanceof(TopicNode)
      expect(nodes[1].subscriptions.size).to.equal(1)
      expect(nodes[1].subscriptions.has(topicCID.toBaseEncodedString())).to.be.true
      expect(topicNode.serialize()).to.deep.equal(topic.serialize())
      done()
    })
  })

  it('publishes a message from the non author node', (done) => {
    const topicB58Str = topicCID.toBaseEncodedString()
    const message = 'foobar'
    // Helper func to run all the expects
    let doneCount = 0
    const checkAllDone = () => {
      doneCount++
      if (doneCount === 3) done()
    }
    let firstEventNode
    // Event listener
    const listener = (eventNode) => {
      // Compare serializes of both events
      if (!firstEventNode) {
        firstEventNode = eventNode
      } else {
        expect(eventNode.serialize()).to.deep.equal(firstEventNode.serialize())
      }

      // Must have publisher
      expect(eventNode.isPublished).to.be.true
      expect(eventNode.topicCID.equals(topicCID)).to.be.true
      expect(eventNode.payload.toString()).to.be.equal(message)
      // Should match subscribed author
      expect(eventNode.author.isEqual(nodes[1].me.info.id)).to.be.true
      // Should match topic author
      expect(eventNode.publisher.isEqual(nodes[0].me.info.id)).to.be.true

      checkAllDone()
    }
    // Setup event listeners
    nodes[1].once(topicB58Str, listener)
    nodes[0].once(topicB58Str, listener)

    nodes[1].publish(topicB58Str, message, (err, eventCID, topicNode, eventNode) => {
      expect(err).to.not.exist
      expect(eventNode).to.be.an.instanceof(EventNode)
      expect(topicNode).to.be.an.instanceof(TopicNode)
      expect(eventNode.topicCID.equals(topicCID)).to.be.true
      expect(eventNode.payload.toString()).to.be.equal(message)
      expect(eventNode.author.isEqual(nodes[1].me.info.id)).to.be.true
      // Should be a request to publish
      expect(eventCID).to.be.null
      expect(eventNode.isPublished).to.be.false
      checkAllDone()
    })
  })

  it('unsubscribe from the topic', (done) => {
    const topicB58Str = topicCID.toBaseEncodedString()
    nodes[1].unsubscribe(topicB58Str, (err) => {
      expect(err).to.not.exist

      expect(nodes[1].subscriptions.size).to.equal(0)

      eventually(() => {
        const topicChildren = nodes[0].me.trees.get(topicB58Str).children
        expect(topicChildren.find(peer => peer.info.id.isEqual(nodes[1].me.info.id))).to.not.exist
      }, done)
    })
  })
})
