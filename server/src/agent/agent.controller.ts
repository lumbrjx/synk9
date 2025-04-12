import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AgentService } from './agent.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

@Controller('agent')
export class AgentController {
	constructor(private readonly agentService: AgentService) { }

	@Post()
	async create(@Body() createAgentDto: CreateAgentDto) {
		return await this.agentService.create(createAgentDto);
	}

	@Get()
	findAll() {
		return this.agentService.findAll();
	}

	@Get(':id')
	findOne(@Param('id') id: string) {
		return this.agentService.findOne(id);
	}

	@Patch(':id')
	async update(@Param('id') id: string, @Body() updateAgentDto: UpdateAgentDto) {
		return await this.agentService.update(id, updateAgentDto);
	}

	@Delete(':id')
	async remove(@Param('id') id: string) {
		return await this.agentService.remove(id);
	}
}
