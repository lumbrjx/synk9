import { Module } from '@nestjs/common';
import { ProcessService } from './process.service';
import { ProcessController } from './process.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessStep } from 'src/entities/process-steps.entity';
import { Process } from 'src/entities/process.entity';

@Module({
	imports: [TypeOrmModule.forFeature([ProcessStep, Process])],
	controllers: [ProcessController],
	providers: [ProcessService],
})
export class ProcessModule { }
