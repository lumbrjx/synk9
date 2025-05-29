import { IsNumber, IsString } from "class-validator";

export class CreateSensorDto {
	@IsString()
	name: string;

	@IsString()
	description: string;

	@IsString()
	register: string;

	@IsString()
	agentId: string;

}
