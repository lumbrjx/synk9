import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { AccountService } from './account.service';
import { CreateAccountDto, LoginDto } from './dto/create-account.dto';

@Controller('account')
export class AccountController {
	constructor(private readonly accountService: AccountService) { }
	@Post("login")
	login(@Body() loginDto: LoginDto) {
		return this.accountService.login(loginDto);
	}
	@Post()
	create(@Body() createAccountDto: CreateAccountDto) {
		return this.accountService.create(createAccountDto);
	}

	@Get()
	findAll() {
		return this.accountService.findAll();
	}

	@Get(':id')
	findOne(@Param('id') id: string) {
		return this.accountService.findOne(id);
	}

	@Delete(':id')
	remove(@Param('id') id: string) {
		return this.accountService.remove(id);
	}
}
