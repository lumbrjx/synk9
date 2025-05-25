import { Global, Module } from '@nestjs/common';
import { AgentModule } from 'src/agent/agent.module';
import { ConnectionStore } from 'src/connection-store/connection-store.service';
import { ConnectionModule } from 'src/connection/connection.module';
import { ProcessModule } from 'src/process/process.module';
import { SyncService } from './sync.service';

@Global()
@Module({
	imports: [ConnectionModule, ProcessModule, AgentModule],
	providers: [ConnectionStore, SyncService ],
	exports: [ConnectionStore, SyncService]
})
export class CordinatorModule { }
