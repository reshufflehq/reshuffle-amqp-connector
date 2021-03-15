# reshuffle-amqp-connector

[Code](https://github.com/reshufflehq/reshuffle-amqp-connector) |
[npm](https://www.npmjs.com/package/reshuffle-amqp-connector) |
[Code sample](https://github.com/reshufflehq/reshuffle-amqp-connector/tree/master/examples)

`npm install reshuffle-amqp-connector`

### Reshuffle AMQP Connector


This package contains a [Reshuffle](https://github.com/reshufflehq/reshuffle)
connector to AMQP (Advanced Message Queuing Protocol).

The connector uses the [amqplib](https://www.npmjs.com/package/amqplib) client package.

An overview of the AMQP concepts and terms is decribed [here](https://www.rabbitmq.com/tutorials/amqp-concepts.html).


The following example connects to a queue, registers a Consumer (see below) with a handler function and sends two messages to the queue:

```js
const { Reshuffle } = require('reshuffle')
const { AMQPConnector } = require('reshuffle-amqp-connector')

  const app = new Reshuffle()
  const amqp = new AMQPConnector(
    app, 
    { queueUrl: process.env.QUEUE_URL // e.g. 'amqp://localhost'
      queueName: process.env.QUEUE_NAME, 
      queueOptions: { durable: true } 
    })

  amqp.on({ noAck: false }, function(msg) {
    console.log(`Mesage ${msg.content.toString()} received`)
  })

  setTimeout(function(){ // See below the reason for using the setTimeout
     amqp.sendMessage('MSG-001', { persistent: true })
     amqp.sendMessage('MSG-002')
  }, 2000)

```

(`*`) A [Consumer](https://www.rabbitmq.com/consumers.html) is a subscription for the queue. 

(`**`) In the above example the `sendMessage` function is called after a short delay just to enbale the `AMQPConnector` to finish all its internal `async` instantiations.

The `AMQPConnector` is implemented as a [Task Queue](https://www.rabbitmq.com/tutorials/tutorial-two-javascript.html) which means that messages are sent to the queue and one or more Consumers can be registered to this queue. 

You can define several Consumers by calling the `AMQPConnector.on` function multiple times with different `eventId`s.

For example, in the following code we create two Consumers that are registered to the same queue.

```js
  amqp.on({ noAck: false }, messageHandler, 'consumer-01')
  amqp.on({ noAck: false }, messageHandler, 'consumer-02')
```

#### Table of Contents

[Configuration](#configuration) Configuration options

[DataTypes](#dataTypes) Data Types

#### Connector Events

[Queue message](#queueMessage) 

[EventDataTypes](#eventDataTypes) Event Data Types

#### Connector Actions

[sendMessage](#sendMessage) Send message to queue
 
[sdk](#sdk) Retrieve the client sdk object


##### <a name="configuration"></a>Configuration options

`AMQPConnector` is based on `amqplib` client package, more details about `amqplib` APIs and datatypes can be found in the [amqplib documentation](http://www.squaremobius.net/amqp.node/channel_api.html)


```typescript
interface AMQPConnectorConfigOptions {
  queueUrl: string
  queueName: string
  queueOptions?: Options.AssertQueue
}
```

##### <a name="dataTypes"></a>DataTypes

<a name="_Options.AssertQueue:_"></a>_Options.AssertQueue:_

```ts
{
  exclusive?: boolean
  durable?: boolean
  autoDelete?: boolean
  arguments?: any
  messageTtl?: number
  expires?: number
  deadLetterExchange?: string
  deadLetterRoutingKey?: string
  maxLength?: number
  maxPriority?: number
}
```
The `Options` namespace can be imported from the [`amqplib`](https://www.npmjs.com/package/amqplib) client.

More details about `Options.AssertQueue` are available [here](http://www.squaremobius.net/amqp.node/channel_api.html#channel_assertQueue).


#### Connector events

##### <a name="queueMessage"></a>Queue message
Register a [Consumer](https://www.rabbitmq.com/consumers.html) to the queue by using the `AMQPConnector.on` function.
The `handler` function will be invoked when a new message is found in the queue.

##### <a name="eventDataTypes"></a>EventDataTypes

```ts
interface AMQPConnectorEventOptions {
  consumeOptions?: Options.Consume
}
```

<a name="_Options.Consume:_"></a>_Options.Consume:_

```ts
{
  consumerTag?: string
  noLocal?: boolean
  noAck?: boolean
  exclusive?: boolean
  priority?: number
  arguments?: any
}
```
More details about `Options.Consume` are available [here](http://www.squaremobius.net/amqp.node/channel_api.html#channel_consume).


#### Connector actions

##### <a name="sendMessage"></a>Send message to queue
Send a single message with the content given as a string to the specific queue.

_Definition:_

```ts
(message: string, publishOptions?: Options.Publish) => boolean
```

_Options.Publish:_

```ts
{
   expiration?: string | number
   userId?: string
   CC?: string | string[]
   mandatory?: boolean
   persistent?: boolean
   deliveryMode?: boolean | number
   BCC?: string | string[]
   contentType?: string
   contentEncoding?: string
   headers?: any
   priority?: number
   correlationId?: string
   replyTo?: string
   messageId?: string
   timestamp?: number
   type?: string
   appId?: string
}
```
More details about `Options.Publish` are available [here](http://www.squaremobius.net/amqp.node/channel_api.html#channel_publish).


_Usage:_

```js
const isMessageSent = amqp.sendMessage('The message text', { 
    deliveryMode: true, 
    expiration: 2000
  })

```


##### <a name="sdk"></a>Full access to the AMQP Client SDK


```js
const channelName = process.env.QUEUE_NAME
const sdk = amqp.sdk()

const connection = await sdk.connect(process.env.QUEUE_URL)
const channel = await connection.createChannel()
await channel.assertQueue(channelName, { durable: true })
await channel.consume(
  channelName,
  (msg) => {
    console.log('SDK MSG: ', msg.content.toString())
    if (msg) { channel.ack(msg) }
  },
  {deliveryMode: true},
)

channel.sendToQueue(channelName, Buffer.from('First message'), {deliveryMode: true})
channel.sendToQueue(channelName, Buffer.from('Second message'))

```