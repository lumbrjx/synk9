import { Injectable } from '@nestjs/common';
import { CreateAccountDto, LoginDto } from './dto/create-account.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Account } from 'src/entities/account.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AccountService {
	constructor(
		@InjectRepository(Account)
		private accountRepository: Repository<Account>,
	) { }

	private randomString(length: number) {
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		let result = '';
		for (let i = 0; i < length; i++) {
			result += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return result;
	}
	async findByUsername(username: string) {
		return this.accountRepository.findOne({ where: { username } });
	}
	async createSuperAdmin() {
		const data = {
			username: "admin",
			password: "admin",
			isSuperAdmin: true
		}
		const createdAccount = this.accountRepository.create(data);
		if (!createdAccount) {
			throw new Error("Failed to create super admin account");
		}
		const saved = await this.accountRepository.save(createdAccount);
		return saved;
	}
	async create(createAccountDto: CreateAccountDto) {
		const data = {
			...createAccountDto,
			password: this.randomString(9)
		}
		const createdAccount = this.accountRepository.create(data);
		if (!createdAccount) {
			throw new Error("Failed to create a new account");
		}
		const saved = await this.accountRepository.save(createdAccount);
		return saved;
	}

	findAll() {
		return this.accountRepository.find();
	}

	async login(loginDto: LoginDto) {
		const userd = await this.accountRepository.findOne({ where: { username: loginDto.username, password: loginDto.password } });
		return {
			user: userd ? userd : false, token: this.randomString(12)
		};
	}

	findOne(id: string) {
		return this.accountRepository.findOne({ where: { id } });
	}

	async remove(id: string) {
		const deleted = await this.accountRepository.softDelete({ id })
		if (deleted.affected) {
			return true;
		}
	}
}
