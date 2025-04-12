import { Injectable } from '@nestjs/common';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Sensor } from 'src/entities';
import { Repository } from 'typeorm';
import { EventBusService } from 'src/event-bus/event-bus.service';

@Injectable()
export class SensorService {

	constructor(
		@InjectRepository(Sensor)
		private sensorRepository: Repository<Sensor>,
		private eventBus: EventBusService,
	) { }

	async create(createSensorDto: CreateSensorDto) {
		const sensor = this.sensorRepository.create(createSensorDto);
		if (!sensor) {
			throw new Error("Failed to create a new sensor");
		}
		const saved = await this.sensorRepository.save(sensor);
		if (saved) {
			this.eventBus.emit("sensor:created", {
				label: saved.name,
				id: saved.id,
				start_register: saved.start_register,
				end_register: saved.end_register
			});
			return saved;
		}
	}

	findAll() {
		return this.sensorRepository.find();
	}

	findOne(id: string) {
		return this.sensorRepository.findOne({ where: { id } });
	}

	async update(id: string, updateSensorDto: UpdateSensorDto) {
		const updatedSensor = await this.sensorRepository.update({ id }, {
			name: updateSensorDto.name,
			description: updateSensorDto.description,
			start_register: updateSensorDto.start_register,
			end_register: updateSensorDto.end_register,
		})
		if (!updatedSensor.affected) {
			throw new Error(`Failed to update the agent with ID: ${id}`);
		}
		this.eventBus.emit("sensor:updated", {
			id,
			label: updateSensorDto.name as string,
			start_register: updateSensorDto.start_register as number,
			end_register: updateSensorDto.end_register as number,
		});
		return updatedSensor
	}

	async remove(id: string) {
		const deleted = await this.sensorRepository.softDelete({ id })
		if (deleted.affected) {
			this.eventBus.emit("sensor:deleted", { id });
		}
	}
}
