import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class Sensor {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column()
	name: string;

	@CreateDateColumn({ type: 'timestamp' })
	createdAt: Date;

	@Column({ nullable: true })
	description: string;

	@Column()
	start_register: number;

	@Column()
	end_register: number;
}

