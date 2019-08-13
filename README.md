
[![pipeline status](https://gitlab.com/jgantunes/js-pulsarcast/badges/master/pipeline.svg)](https://gitlab.com/jgantunes/js-pulsarcast/commits/master)
[![coverage report](https://gitlab.com/jgantunes/js-pulsarcast/badges/master/coverage.svg)](https://gitlab.com/jgantunes/js-pulsarcast/commits/master)

# JS Pulsarcast

A JS implementation of [Pulsarcast](https://github.com/JGAntunes/pulsarcast)

**Keep in mind that this module is quite alpha :hammer:**

## Install

```
npm install pulsarcast
```

## Usage

```javascript
const Pulsarcast = require('pulsarcast')

// node is Libp2p Node
const pulsarcastNode = new Pulsarcast(node)

const pulsarcastNode.start((err) => {
  if (err) console.log('No!!!', err)
  
  pulsarcastNode.createTopic('fuuuuun', (err, cid, topicNode) => {
    if (err) console.log('No!!!', err)
    
    console.log('Our new topic \o/', topicNode)
    
    pulsarcastNode.on(cid.toBaseEncodedString(), (eventNode) => {
      console.log('event', eventNode)
    })
    
    pulsarcastNode.publish(cid.toBaseEncodedString(), new Buffer('yolo!'), (err, eventCID) => {
      if (err) console.log('No!!!', err)
      console.log('published', eventCID.toBaseEncodedString())
    })
  })
})
```

## API

Check the [API documentation](./docs/api.md)

## Notes

Currently we're still relying on a couple of forks from `libp2p`/`ipfs` projects. Hence a lot of the git dependencies in the `package.json`, specifically `kad-dht` and `js-libp2p`. The long term plan of course is to either merge the changes upstream or find alternative methods for our needs.

**Browser support** is still no guaranteed. All of the testing and development is currently being done on NodeJS only, although the plan is to have this done for the browser also :+1:

## Supporters

This module and relevant work detailed in the [Pulsarcast](https://github.com/JGAntunes/pulsarcast) spec has been developed by [me](https://jgantunes.com) with the amazing support and supervision of [Luís Veiga](https://www.gsd.inesc-id.pt/~lveiga/), in [INESC-ID Lisboa (Distributed Systems Group)](https://www.gsd.inesc-id.pt/) and [Instituto Superior Técnico, Universidade de Lisboa](https://tecnico.ulisboa.pt/)

A special thank you note to [Microsoft Azure](https://azure.microsoft.com/en-us/) for sponsoring the tests for this project by providing crucial infrastructure support.


## License

MIT
