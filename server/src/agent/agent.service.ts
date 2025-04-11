import { Injectable } from '@nestjs/common';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from 'src/entities';

@Injectable()
export class AgentService {
	constructor(
		@InjectRepository(Agent)
		private agentRepository: Repository<Agent>,
	) { }
	async create(createAgentDto: CreateAgentDto) {
		const createdAgent = this.agentRepository.create(createAgentDto);
		if (!createdAgent) {
			throw new Error("Failed to create a new agent");
		}
		return await this.agentRepository.save(createdAgent);
	}

	findAll() {
		return this.agentRepository.find();
	}

	findOne(id: string) {
		return this.agentRepository.findOne({ where: { id } });
	}

	async update(updateAgentDto: UpdateAgentDto) {
		const updatedAgent = await this.agentRepository.update({ id: updateAgentDto.id }, {
			description: updateAgentDto.description,
			locked: updateAgentDto.locked,
			plcId: updateAgentDto.plcId,
			name: updateAgentDto.name
		})
		if (updatedAgent.affected === 0) {
			throw new Error(`Failed to update the agent with ID: ${updateAgentDto.id}`);
		}
		return updatedAgent;
	}

	async remove(id: string) {
		await this.agentRepository.softDelete({ id })
	}
}
