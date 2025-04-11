import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConnectionModule } from './connection/connection.module';
import { MasterGateway } from './master/master.gateway';
import { ProcessModule } from './process/process.module';
import { AgentModule } from './agent/agent.module';

@Module({
	imports: [ConnectionModule, ProcessModule, AgentModule],
	controllers: [AppController],
	providers: [AppService, MasterGateway],
})
export class AppModule { }
