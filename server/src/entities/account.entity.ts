import { Entity, PrimaryGeneratedColumn, Column, DeleteDateColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class Account {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ nullable: false })
	username: string;

	@Column({ nullable: true })
	password: string;

	@Column({ nullable: true })
	isSuperAdmin: boolean;

	@DeleteDateColumn()
	deletedAt?: Date;

	@CreateDateColumn({ type: 'timestamp' })
	createdAt: Date;

}

