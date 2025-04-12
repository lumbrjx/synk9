import { Injectable } from '@nestjs/common';
import { UpdateProcessDto } from './dto/update-process.dto';
import { CreateProcessDto } from './dto/create-process.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Process } from 'src/entities';
import { Repository } from 'typeorm';

@Injectable()
export class ProcessService {
	constructor(
		@InjectRepository(Process)
		private processRepository: Repository<Process>,
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

	findOne(id: string) {
		return this.processRepository.findOne({ where: { id } });
	}

	async update(id: string, updateProcessDto: UpdateProcessDto) {
		const updatedProcess = await this.processRepository.update({ id }, {
			description: updateProcessDto.description,
			label: [updateProcessDto.label as string],
			agent: { id: updateProcessDto.agentId },
			name: updateProcessDto.name
		})
		if (!updatedProcess.affected) {
			throw new Error(`Failed to update the agent with ID: ${id}`);
		}
		return updatedProcess;
	}

	async remove(id: string) {
		await this.processRepository.softDelete({ id })
	}
}
