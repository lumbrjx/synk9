import { Module } from '@nestjs/common';
import { ConnectionStore } from './connection-store.service';
import { ConnectionModule } from 'src/connection/connection.module';

@Module({
	imports: [ConnectionModule],
	providers: [ConnectionStore],
})
export class ConnectionStoreModule { }
