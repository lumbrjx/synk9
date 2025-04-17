import { Injectable } from '@nestjs/common';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from 'src/entities';
import { EventBusService } from 'src/event-bus/event-bus.service';

@Injectable()
export class AgentService {
	constructor(
		@InjectRepository(Agent)
		private agentRepository: Repository<Agent>,
		private eventBus: EventBusService,
	) { }
	async create(createAgentDto: CreateAgentDto) {
		const createdAgent = this.agentRepository.create(createAgentDto);
		if (!createdAgent) {
			throw new Error("Failed to create a new agent");
		}
		const saved = await this.agentRepository.save(createdAgent);
		if (saved) {
			this.eventBus.emit("agent:created", { id: saved.id });
			return saved
		}
	}

	findAll() {
		return this.agentRepository.find();
	}

	findOne(id: string) {
		return this.agentRepository.findOne({ where: { id } });
	}

	async update(id: string, updateAgentDto: UpdateAgentDto) {
		const updatedAgent = await this.agentRepository.update({ id }, {
			description: updateAgentDto.description,
			locked: updateAgentDto.locked,
			plcId: updateAgentDto.plcId,
			name: updateAgentDto.name
		})
		if (!updatedAgent.affected) {
			throw new Error(`Failed to update the agent with ID: ${id}`);
		}
		this.eventBus.emit("agent:updated", { id });
		return updatedAgent;
	}

	async remove(id: string) {
		const deleted = await this.agentRepository.softDelete({ id })
		if (deleted.affected) {
			this.eventBus.emit("agent:deleted", { id });
		}
	}
}
