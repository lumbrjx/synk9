import { IsString } from "class-validator";

export class CreateAgentDto {
	@IsString()
	name: string;

	@IsString()
	description: string;

	@IsString()
	plcId: string;

	@IsString()
	fingerprint: string;
}
