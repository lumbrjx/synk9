import { PartialType } from '@nestjs/mapped-types';
import { CreateProcessStepDto } from './create-process.dto';

export class UpdateProcessDto extends PartialType(CreateProcessStepDto) { }
