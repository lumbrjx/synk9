import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateAlertTopicDto } from './create-alert-topic.dto';
import { IsString } from 'class-validator';

export class UpdateAlertTopicDto extends PartialType(OmitType(CreateAlertTopicDto, ['agentId'] as const)) {
  @IsString()
  agentId: string;
}

