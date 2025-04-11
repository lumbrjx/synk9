import { IsString } from "class-validator";

export class DeleteAgentDto {
	@IsString()
	id: string;
}
