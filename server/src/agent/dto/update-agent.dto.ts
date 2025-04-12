import { PartialType } from '@nestjs/mapped-types';
import { CreateAgentDto } from './create-agent.dto';
import { IsBoolean} from 'class-validator';

export class UpdateAgentDto extends PartialType(CreateAgentDto) {
	@IsBoolean()
	locked: boolean;
}
