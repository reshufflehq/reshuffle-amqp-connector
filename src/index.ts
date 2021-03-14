import amqplib, { Connection, Channel, Options, ConsumeMessage } from 'amqplib'
import { Reshuffle, EventConfiguration, BaseConnector } from 'reshuffle-base-connector'

export interface AMQPConnectorConfigOptions {
  queueUrl: string
  queueName: string
  queueOptions?: Options.AssertQueue
}

export interface AMQPConnectorEventOptions {
  consumeOptions?: Options.Consume
}

export default class AMQPConnector extends BaseConnector {
  private client: typeof amqplib
  private connectionPublisher?: Connection
  private connectionConsumer?: Connection
  private channelPublisher?: Channel
  private channelConsumer?: Channel
  private handlersByEventId: { [eventId: string]: any } = {}

  constructor(app: Reshuffle, options: AMQPConnectorConfigOptions, id?: string) {
    super(app, options, id)
    this.client = amqplib
    if (!options) {
      throw new Error('Empty connection config')
    }
  }

  on(options: AMQPConnectorEventOptions, handler: any, eventId: string): EventConfiguration {
    if (!eventId) {
      eventId = `AMQP/${this.configOptions?.queueUrl}/${this.id}`
    }

    const event: EventConfiguration = new EventConfiguration(eventId, this, options)
    this.eventConfigurations[eventId] = event
    this.handlersByEventId[eventId] = handler
    return event
  }

  async onStart(): Promise<void> {
    await this.createQueue(true)
    await this.createQueue(false)
    Object.entries(this.handlersByEventId).forEach(async ([eventId, handler]) => {
      await this.consume(handler, this.eventConfigurations[eventId].options)
    })
  }

  public onStop() {
    this.app.getLogger().info('Closing connections and channels')
    // Closing a connection automatically closes all channels on it
    this.connectionConsumer?.close
    this.connectionPublisher?.close
  }

  private async createQueue(isConsumer: boolean) {
    const connection = await amqplib.connect(this.configOptions.queueUrl)
    const channel = await connection.createChannel()
    await channel.assertQueue(this.configOptions.queueName, this.configOptions.queueOptions)
    this.setChannels(isConsumer, connection, channel)
  }

  private setChannels(isConsumer: boolean, connection: Connection, channel: Channel) {
    if (isConsumer) {
      this.channelConsumer = channel
      this.connectionConsumer = connection
    } else {
      this.channelPublisher = channel
      this.connectionPublisher = connection
    }
  }

  private async consume(
    onMessage: (msg: ConsumeMessage | null) => void,
    consumeOptions?: Options.Consume,
  ) {
    await this.channelConsumer?.consume(
      this.configOptions.queueName,
      (msg) => {
        onMessage(msg)
        if (msg) { this.channelConsumer?.ack(msg) }
      },
      consumeOptions,
    )
  }

  public sendMessage(message: string, publishOptions?: Options.Publish): boolean {
    if(!this.channelPublisher) {
      return false
    }
    return this.channelPublisher.sendToQueue(
      this.configOptions.queueName,
      Buffer.from(message),
      publishOptions,
    )
  }

  // Full list of actions in SDK:
  // http://www.squaremobius.net/amqp.node/channel_api.html
  public sdk(): typeof amqplib {
    return this.client
  }
}

export { AMQPConnector }
