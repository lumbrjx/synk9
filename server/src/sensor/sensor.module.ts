import { Module } from '@nestjs/common';
import { SensorService } from './sensor.service';
import { SensorController } from './sensor.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Process, Sensor } from 'src/entities';
import { AgentModule } from 'src/agent/agent.module';
import { ParsersService } from 'src/parsers/parsers.service';

@Module({
	imports: [TypeOrmModule.forFeature([Sensor, Process]), AgentModule],
	controllers: [SensorController],
	providers: [SensorService, ParsersService],
})
export class SensorModule { }
