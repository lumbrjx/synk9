import { Module } from '@nestjs/common';
import { ConnectionModule } from './connection/connection.module';
import { ProcessModule } from './process/process.module';
import { AgentModule } from './agent/agent.module';
import { CordinatorGateway } from './cordinator/cordinator.gateway';
import { CordinatorModule } from './cordinator/cordinator.module';
import { EventBusModule } from './event-bus/event-bus.module';

@Module({
	imports: [ConnectionModule, ProcessModule, AgentModule, CordinatorModule, EventBusModule],
	providers: [CordinatorGateway],
	exports: [CordinatorGateway]
})
export class AppModule { }
