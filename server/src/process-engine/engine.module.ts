import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessStep } from 'src/entities/process-steps.entity';
import { Process } from 'src/entities/process.entity';
import { Rule, Sensor } from 'src/entities';
import { BullModule } from '@nestjs/bullmq';
import { ProcessEngineService } from './engine.service';
import { GlobalProcessService } from './processor.service';
import { GlobalProcessWorker } from './processor.worker';
import { StreamManager } from './stream.service';

@Global()
@Module({
	imports: [TypeOrmModule.forFeature([ProcessStep, Process, Sensor, Rule]),
	BullModule.registerQueue({
		name: 'global-process',
	}),
	],
	providers: [ProcessEngineService, GlobalProcessService, GlobalProcessWorker, StreamManager],
	exports: [ProcessEngineService, GlobalProcessService, GlobalProcessWorker, StreamManager],
})
export class ProcessEngineModule { }
