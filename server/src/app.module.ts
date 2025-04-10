import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConnectionModule } from './connection/connection.module';
import { MasterGateway } from './master/master.gateway';

@Module({
	imports: [ConnectionModule],
	controllers: [AppController],
	providers: [AppService, MasterGateway],
})
export class AppModule { }
