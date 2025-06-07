import { Controller, Get, InternalServerErrorException, Param } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { SensorService } from 'src/sensor/sensor.service';

@Controller('logs')
export class LoggerController {
	constructor(private readonly loggerService: LoggerService, private readonly sensorService: SensorService) { }

	@Get(':time')
	async findAll(@Param('time') time: string) {
		const logs: any[] = [];
		const sensors = await this.sensorService.findAll()
		if (!sensors || !sensors.length) throw new InternalServerErrorException("No sensors");
		const sensorsIds = sensors.map(sensor => sensor.id);
		for (const sensorId of sensorsIds) {
			const log = await this.loggerService.getLogs(sensorId, time);
			if (log) logs.push({sensor_id: sensorId, logs: log})
		}
		return logs;
	}
	@Get(':sensorId/:time')
	async findOne(@Param('sensorId') sensorId: string, @Param('time') time: string) {
		const log = await this.loggerService.getLogs(sensorId, time);
		if (!log) throw new InternalServerErrorException(`No logs found for sensor ${sensorId}`);
		return log;
	}
}
