import { Module } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { LoggerController } from './logger.controller';
import { ConnectionModule } from 'src/connection/connection.module';
import { SensorService } from 'src/sensor/sensor.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Process, Sensor } from 'src/entities';
import { AgentModule } from 'src/agent/agent.module';
import { ParsersService } from 'src/parsers/parser-builder.service';

@Module({
	imports: [ConnectionModule, TypeOrmModule.forFeature([Sensor, Process]), AgentModule],
	providers: [LoggerService, SensorService, ParsersService],
	exports: [LoggerService],
	controllers: [LoggerController]
})
export class LoggerModule { }
