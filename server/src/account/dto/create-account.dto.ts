import { IsBoolean, IsString } from "class-validator";

export class CreateAccountDto  {
	@IsString()
	username: string;

	@IsBoolean()
	isSuperAdmin: boolean;
}
export class LoginDto{
	@IsString()
	username: string;

	@IsString()
	password: string;
}
