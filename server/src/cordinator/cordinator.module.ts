import { Module } from '@nestjs/common';
import { CordinatorGateway } from './cordinator.gateway';
import { EventBusService } from 'src/event-bus/event-bus.service';

@Module({
	providers: [CordinatorGateway],
})
export class CordinatorModule { }
