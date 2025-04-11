import { IsArray, IsNumber, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class SensorDto {
	@IsString()
	id: string;
}

class RuleDto {
	@IsString()
	sensor_id: string;

	@IsNumber()
	final_value: number;
}

export class CreateProcessStepDto {
	@IsString()
	name: string;

	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => SensorDto)
	sensors: SensorDto[];

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
	agentId: string;
}
