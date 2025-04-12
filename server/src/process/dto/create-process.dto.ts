import { IsArray, IsNumber, IsString, IsUUID, ValidateNested } from "class-validator";
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

	@IsString()
	label: string;

	@IsUUID()
	agentId: string;
}
