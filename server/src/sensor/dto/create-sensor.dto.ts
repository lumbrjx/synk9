import { IsNumber, IsString } from "class-validator";

export class CreateSensorDto {
	@IsString()
	name: string;

	@IsString()
	description: string;

	@IsNumber()
	start_register: number;

	@IsNumber()
	end_register: number;

}
