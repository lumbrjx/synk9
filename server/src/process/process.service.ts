import { Injectable } from '@nestjs/common';
import { UpdateProcessDto } from './dto/update-process.dto';
import { CreateProcessDto } from './dto/create-process.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Process, ProcessState } from 'src/entities';
import { Repository } from 'typeorm';
import { EventBusService } from 'src/event-bus/event-bus.service';

@Injectable()
export class ProcessService {
	constructor(
		@InjectRepository(Process)
		private processRepository: Repository<Process>,
		private eventBus: EventBusService,
	) { }
	async create(createProcessDto: CreateProcessDto) {
		const process = this.processRepository.create({
			name: createProcessDto.name,
			description: createProcessDto.description,
			agent: { id: createProcessDto.agentId }
		});

		return await this.processRepository.save(process);
	}

	findAll() {
		return this.processRepository.find();
	}

	findOne(id: string, relations?: string[]) {
		return this.processRepository.findOne({ where: { id }, relations });
	}
	async updateState(id: string, status: ProcessState) {
		const updatedProcess = await this.processRepository.update({ id }, {
			status
		})
		if (!updatedProcess.affected) {
			throw new Error(`Failed to update the agent with ID: ${id}`);
		}

		// this.eventBus.emit("process:updated", { id: updatedProcess.raw.id, agentId: updatedProcess.raw.agent.id });
		return updatedProcess;
	}
	async updateFlow(id: string, updateProcessDto: UpdateProcessDto) {
		console.log("im process data:", updateProcessDto)

		const process = await this.processRepository.findOne({ where: { id } })
		if (!process) {
			throw new Error("Cannot find process")
		}
		if (process.status === ProcessState.running) {
			throw new Error("Cannot edit a running process")
		}
		const updatedProcess = await this.processRepository.update({ id }, {
			flow: updateProcessDto as any
		})
		if (!updatedProcess.affected) {
			throw new Error(`Failed to update the agent with ID: ${id}`);
		}

		// this.eventBus.emit("process:updated", { id: updatedProcess.raw.id, agentId: updatedProcess.raw.agent.id });
		return updatedProcess;
	}
	async update(id: string, updateProcessDto: UpdateProcessDto) {

		const process = await this.processRepository.findOne({ where: { id } })
		if (!process) {
			throw new Error("Cannot find process")
		}
		if (process.status === ProcessState.running) {
			throw new Error("Cannot edit a running process")
		}
		const updatedProcess = await this.processRepository.update({ id }, {
			description: updateProcessDto.description,
			agent: { id: updateProcessDto.agentId },
			name: updateProcessDto.name
		})
		if (!updatedProcess.affected) {
			throw new Error(`Failed to update the agent with ID: ${id}`);
		}

		// this.eventBus.emit("process:updated", { id: updatedProcess.raw.id, agentId: updatedProcess.raw.agent.id });
		return updatedProcess;
	}

	async remove(id: string) {
		const process = await this.processRepository.findOne({ where: { id } })
		if (!process) {
			throw new Error("Cannot find process")
		}
		if (process.status === ProcessState.running) {
			throw new Error("Cannot edit a running process")
		}
		await this.processRepository.softDelete({ id });
		this.eventBus.emit("process:deleted", { id });
	}
}
