// cordinator.gateway.ts
import { Logger, OnModuleInit } from '@nestjs/common';
import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { EventBusService } from 'src/event-bus/event-bus.service';

@WebSocketGateway({ cors: true })
export class CordinatorGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private server: Server;
  private logger = new Logger(CordinatorGateway.name);

  constructor(private eventBus: EventBusService) {}

  afterInit(server: Server) {
    this.server = server;
    this.logger.log('WebSocket server initialized');
    
    this.eventBus.on("agent:created").subscribe(this.agentCreated.bind(this));
    this.eventBus.on("agent:updated").subscribe(this.agentUpdated.bind(this));
    this.eventBus.on("agent:deleted").subscribe(this.agentDeleted.bind(this));
  }

  agentUpdated(payload: any) {
    this.logger.log('Agent updated:', payload);
    this.server.emit("agent:updated", payload);
  }

  agentDeleted(payload: any) {
    this.logger.log('Agent deleted:', payload);
    this.server.emit("", payload);
  }

  agentCreated(payload: any) {
    this.logger.log('Agent created:', payload);
    this.server.emit("test", payload);
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('messageToServer')
  handleMessage(
    @MessageBody() data: string,
    @ConnectedSocket() client: Socket,
  ): void {
    this.logger.log(`Received message: ${data}`);
    this.server.emit('messageToClient', data);
  }
}
