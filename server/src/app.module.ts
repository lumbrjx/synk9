import { Module } from '@nestjs/common';
import { ConnectionModule } from './connection/connection.module';
import { MasterGateway } from './master/master.gateway';
import { ProcessModule } from './process/process.module';
import { AgentModule } from './agent/agent.module';

@Module({
	imports: [ConnectionModule, ProcessModule, AgentModule],
	providers: [MasterGateway],
})
export class AppModule { }
