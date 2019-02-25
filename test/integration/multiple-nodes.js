/* eslint-env mocha */
/* eslint no-unused-expressions: 0 */
'use strict'

const chai = require('chai')
const expect = chai.expect
const { each } = require('async')
const Pulsarcast = require('../../src')
const TopicNode = require('../../src/dag/topic-node')
const EventNode = require('../../src/dag/event-node')
const { createNodes } = require('../utils')

describe('multiple nodes', function () {
  this.timeout(50000)
  let nodes
  let topic
  let topicCID

  // Parameters
  const nodeNumber = 100
  const publisher = 1
  const subscriber = 80

  before((done) => {
    createNodes(nodeNumber, (err, p2pNodes) => {
      expect(err).not.to.exist
      nodes = p2pNodes.map((node) => new Pulsarcast(node))
      done()
    })
  })

  it(`starts ${nodeNumber} nodes`, (done) => {
    each(nodes, (node, cb) => node.start(cb), (err) => {
      expect(err).to.not.exist
      nodes.forEach(node => {
        expect(node.started).to.be.true
      })
      done()
    })
  })

  it('creates a topic', (done) => {
    nodes[publisher].createTopic('test', (err, savedCID, topicNode) => {
      expect(err).to.not.exist
      expect(topicNode).to.be.an.instanceof(TopicNode)
      topicNode.getCID((err, cid) => {
        expect(err).to.not.exist
        const topicB58Str = cid.toBaseEncodedString()
        expect(cid.equals(savedCID)).to.be.true
        expect(nodes[publisher].subscriptions.size).to.equal(1)
        expect(nodes[publisher].subscriptions.has(topicB58Str)).to.be.true
        topic = topicNode
        topicCID = cid
        done()
      })
    })
  })

  it('subscribes to the previously created topic', (done) => {
    nodes[subscriber].subscribe(topicCID.toBaseEncodedString(), (err, topicNode) => {
      expect(err).to.not.exist
      expect(topicNode).to.be.an.instanceof(TopicNode)
      expect(nodes[subscriber].subscriptions.size).to.equal(1)
      expect(nodes[subscriber].subscriptions.has(topicCID.toBaseEncodedString())).to.be.true
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
      expect(eventNode.author.isEqual(nodes[subscriber].me.info.id)).to.be.true
      // Should match topic author
      expect(eventNode.publisher.isEqual(nodes[publisher].me.info.id)).to.be.true

      checkAllDone()
    }
    // Setup event listeners
    nodes[subscriber].once(topicB58Str, listener)
    nodes[publisher].once(topicB58Str, listener)

    nodes[subscriber].publish(topicB58Str, message, (err, eventCID, topicNode, eventNode) => {
      expect(err).to.not.exist
      expect(eventNode).to.be.an.instanceof(EventNode)
      expect(topicNode).to.be.an.instanceof(TopicNode)
      expect(eventNode.topicCID.equals(topicCID)).to.be.true
      expect(eventNode.payload.toString()).to.be.equal(message)
      expect(eventNode.author.isEqual(nodes[subscriber].me.info.id)).to.be.true
      // Should be a request to publish
      expect(eventCID).to.be.null
      expect(eventNode.isPublished).to.be.false

      checkAllDone()
    })
  })
})
