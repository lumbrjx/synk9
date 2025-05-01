import { PartialType } from '@nestjs/mapped-types';
import { CreateProcessDto, CreateProcessStepDto } from './create-process.dto';
import { IsBoolean } from 'class-validator';

export class UpdateProcessDto extends PartialType(CreateProcessDto) {
	flow: any;
}
export class UpdateProcessStepDto extends PartialType(CreateProcessStepDto) {
	@IsBoolean()
	skip: boolean;
}
