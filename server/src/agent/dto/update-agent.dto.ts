import { PartialType } from '@nestjs/mapped-types';
import { CreateAgentDto } from './create-agent.dto';
import { IsBoolean, IsString } from 'class-validator';

export class UpdateAgentDto extends PartialType(CreateAgentDto) {
	@IsString()
	id: string;

	@IsBoolean()
	locked: boolean;
}
