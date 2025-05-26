import { IsArray, IsEnum, IsString, IsUUID, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { AlertType } from "src/entities";

class RuleDto {
	@IsString()
	sensor_id: string;

	@IsString()
	expectedValue: string;
}

export class CreateAlertTopicDto {
	@IsUUID()
	agentId: string;

	@IsString()
	name: string;

	@IsString()
	message: string;

	@IsEnum(AlertType)
	alertType: AlertType;

	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => RuleDto)
	rules: RuleDto[];
}

