import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CreateProcessStepDto } from './dto/create-process.dto';
import { UpdateProcessStepDto } from './dto/update-process.dto';
import { ProcessStepService } from './process-step.service';

@Controller('process/step')
export class ProcessStepController {
	constructor(private readonly processStepService: ProcessStepService) { }

	@Post()
	create(@Body() createProcessDto: CreateProcessStepDto) {
		return this.processStepService.create(createProcessDto);
	}

	@Get()
	findAll() {
		return this.processStepService.findAll();
	}

	@Get(':id')
	findOne(@Param('id') id: string) {
		return this.processStepService.findOne(id);
	}

	@Patch(':id')
	update(@Param('id') id: string, @Body() updateProcessStepDto: UpdateProcessStepDto) {
		return this.processStepService.update(id, updateProcessStepDto);
	}

	@Delete(':id')
	remove(@Param('id') id: string) {
		return this.processStepService.remove(id);
	}
}
