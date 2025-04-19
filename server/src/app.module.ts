import { Module } from '@nestjs/common';
import { ConnectionModule } from './connection/connection.module';
import { ProcessModule } from './process/process.module';
import { AgentModule } from './agent/agent.module';
import { CordinatorGateway } from './cordinator/cordinator.gateway';
import { CordinatorModule } from './cordinator/cordinator.module';
import { EventBusModule } from './event-bus/event-bus.module';
import { SensorModule } from './sensor/sensor.module';
import { ConnectionStoreModule } from './connection-store/connection-store.module';
import { ProcessEngineModule } from './process-engine/engine.module';

@Module({
	imports: [
		ConnectionModule,
		ProcessModule,
		AgentModule,
		CordinatorModule,
		EventBusModule,
		SensorModule,
		ConnectionStoreModule,
		ProcessEngineModule
	],
	providers: [CordinatorGateway],
	exports: [CordinatorGateway]
})
export class AppModule { }
