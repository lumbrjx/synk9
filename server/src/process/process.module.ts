import { Module } from '@nestjs/common';
import { ProcessService } from './process.service';
import { ProcessController } from './process.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessStep } from 'src/entities/process-steps.entity';
import { Process } from 'src/entities/process.entity';
import { ProcessStepController } from './process-step.controller';
import { ProcessStepService } from './process-step.service';
import { Rule, Sensor } from 'src/entities';

@Module({
	imports: [TypeOrmModule.forFeature([ProcessStep, Process, Sensor, Rule])],
	controllers: [ProcessController, ProcessStepController],
	providers: [ProcessService, ProcessStepService],
	exports: [ProcessService],
})
export class ProcessModule { }
