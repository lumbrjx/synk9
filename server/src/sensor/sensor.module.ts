import { Module } from '@nestjs/common';
import { SensorService } from './sensor.service';
import { SensorController } from './sensor.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Process, Sensor } from 'src/entities';
import { AgentModule } from 'src/agent/agent.module';

@Module({
	imports: [TypeOrmModule.forFeature([Sensor, Process]), AgentModule],
	controllers: [SensorController],
	providers: [SensorService],
})
export class SensorModule { }
