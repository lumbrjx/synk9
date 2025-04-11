import { Injectable } from '@nestjs/common';
import { UpdateProcessDto } from './dto/update-process.dto';
import { CreateProcessDto, CreateProcessStepDto } from './dto/create-process.dto';

@Injectable()
export class ProcessService {
	create(createProcessDto: CreateProcessDto) {
		return 'This action adds a new process';
	}

	findAll() {
		return `This action returns all process`;
	}

	findOne(id: number) {
		return `This action returns a #${id} process`;
	}

	update(id: number, updateProcessDto: UpdateProcessDto) {
		return `This action updates a #${id} process`;
	}

	remove(id: number) {
		return `This action removes a #${id} process`;
	}
}
