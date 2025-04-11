import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Sensor {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column()
	name: string;

	@Column({ nullable: true })
	description: string;

	@Column()
	startRegister: number;

	@Column()
	endRegister: number;
}

