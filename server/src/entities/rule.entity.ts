import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, DeleteDateColumn } from 'typeorm';
import { AlertTopic } from './alerts-topics.entity';

@Entity()
export class Rule {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column()
	memoryAddress: string;

	@CreateDateColumn({ type: 'timestamp' })
	createdAt: Date;

	@Column()
	expectedValue: string;

	@ManyToOne(() => AlertTopic, topic => topic.rules, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'id' })
	alertTopic: AlertTopic;

	@DeleteDateColumn({ type: 'timestamp', nullable: true })
	deletedAt?: Date;

}

