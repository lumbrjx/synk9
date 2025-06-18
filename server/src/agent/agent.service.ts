import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent, AgentState } from 'src/entities';
import { EventBusService } from 'src/event-bus/event-bus.service';

@Injectable()
export class AgentService {
	private PLC_MODELS = ["LOGO!"];
	constructor(
		@InjectRepository(Agent)
		private agentRepository: Repository<Agent>,
		private eventBus: EventBusService,
	) { }
	async create(createAgentDto: CreateAgentDto) {
		if (!this.PLC_MODELS.includes(createAgentDto.plcId)) {
			throw new BadRequestException("The provided PLC is not supported")
		}
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
	async changeAgentState(id: string, status: AgentState) {
		try {
			await this.agentRepository.update({ id }, { status });
		} catch {
			await this.agentRepository.update({ fingerprint: id }, { status });
		}
	}

	findAll() {
		return this.agentRepository.find();
	}
	findByFingerprint(fingerprint: string, relations?: string[]) {
		return this.agentRepository.findOne({ where: { fingerprint }, relations });
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
		this.eventBus.emit("agent:updated", { id, locked: updateAgentDto.locked });
		return updatedAgent;
	}

	async remove(id: string) {
		const deleted = await this.agentRepository.softDelete({ id })
		if (deleted.affected) {
			this.eventBus.emit("agent:deleted", { id });
		}
	}
}
