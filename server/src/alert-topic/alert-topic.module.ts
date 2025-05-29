import { Module } from '@nestjs/common';
import { AlertTopicService } from './alert-topic.service';
import { AlertTopicController } from './alert-topic.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertTopic, Rule } from 'src/entities';
import { AgentModule } from 'src/agent/agent.module';
import { ParsersService } from 'src/parsers/parsers.service';

@Module({
	imports: [TypeOrmModule.forFeature([Rule, AlertTopic]), AgentModule],
  controllers: [AlertTopicController],
  providers: [AlertTopicService, ParsersService],
})
export class AlertTopicModule {}
