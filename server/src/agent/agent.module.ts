import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from 'src/entities';

@Module({
	imports: [TypeOrmModule.forFeature([Agent])],
	controllers: [AgentController],
	providers: [AgentService],
})
export class AgentModule { }
