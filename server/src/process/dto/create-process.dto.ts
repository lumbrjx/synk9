import { IsArray, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class SensorDto {
	@IsString()
	id: string;
}

class RuleDto {
	@IsUUID()
	sensor_id: string;

	@IsNumber()
	final_value: number;
}

export class CreateProcessStepDto {
	@IsString()
	name: string;

	@IsString()
	description: string;

	@IsString()
	processId: string;


	@IsOptional()  // Allow 'from' to be undefined or null
	@IsString()
	from?: string | null;

	@IsOptional()  // Allow 'to' to be undefined or null
	@IsString()
	to?: string | null;

	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => RuleDto)
	rules: RuleDto[];
}

export class CreateProcessDto {
	@IsString()
	name: string;

	@IsString()
	description: string;
	
	@IsUUID()
	agentId: string;
}
