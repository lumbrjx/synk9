import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateAgentDto } from './create-agent.dto';
import { IsBoolean } from 'class-validator';

export class UpdateAgentDto extends PartialType(OmitType(CreateAgentDto, ['fingerprint'] as const)) {
  @IsBoolean()
  locked: boolean;
}

