import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AgentService } from './agent.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { DeleteAgentDto } from './dto/delete-agent.dto';

@Controller('agent')
export class AgentController {
	constructor(private readonly agentService: AgentService) { }

	@Post()
	create(@Body() createAgentDto: CreateAgentDto) {
		return this.agentService.create(createAgentDto);
	}

	@Get()
	findAll() {
		return this.agentService.findAll();
	}

	@Get(':id')
	findOne(@Param('id') id: string) {
		return this.agentService.findOne(id);
	}

	@Patch()
	update(@Body() updateAgentDto: UpdateAgentDto) {
		return this.agentService.update(updateAgentDto);
	}

	@Delete()
	remove(@Body() deleteAgentDto: DeleteAgentDto) {
		return this.agentService.remove(deleteAgentDto.id);
	}
}
