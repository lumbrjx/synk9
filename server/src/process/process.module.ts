import { Module } from '@nestjs/common';
import { ProcessService } from './process.service';
import { ProcessController } from './process.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessStep } from 'src/entities/process-steps.entity';
import { Process } from 'src/entities/process.entity';
import { ProcessStepController } from './process-step.controller';
import { ProcessStepService } from './process-step.service';
import { Agent, Rule, Sensor } from 'src/entities';
import { AgentService } from 'src/agent/agent.service';
import { AgentModule } from 'src/agent/agent.module';

@Module({
	imports: [TypeOrmModule.forFeature([ProcessStep, Process, Sensor, Rule, Agent]), AgentModule],
	controllers: [ProcessController, ProcessStepController],
	providers: [ProcessService, ProcessStepService, AgentService],
	exports: [ProcessService, AgentService],
})
export class ProcessModule { }
