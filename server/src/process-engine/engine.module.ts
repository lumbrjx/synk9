import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessStep } from 'src/entities/process-steps.entity';
import { Process } from 'src/entities/process.entity';
import { Rule, Sensor } from 'src/entities';
import { BullModule } from '@nestjs/bullmq';
import { ProcessEngineService } from './engine.service';
import { GlobalProcessConsumer } from './processor.service';

@Module({
	imports: [TypeOrmModule.forFeature([ProcessStep, Process, Sensor, Rule]),
	BullModule.registerQueue({
		name: 'global-process',
	}),
	],
	providers: [ProcessEngineService, GlobalProcessConsumer],
})
export class ProcessEngineModule { }
