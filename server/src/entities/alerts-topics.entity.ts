import { Entity, PrimaryGeneratedColumn, Column, OneToMany, DeleteDateColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Rule } from './rule.entity';
import { Agent } from './agent.entity';

export enum AlertType {
	normal = 'normal',
	scheduled = 'scheduled',
	offline = 'offline',
	incident = "incident",
	breakdown = "breakdown"
}

@Entity()
export class AlertTopic {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ nullable: false })
	name: string;

	@Column({ nullable: false })
	message: string;

	@Column({
		type: 'enum',
		enum: AlertType,
		default: AlertType.normal,
	})
	alertType: AlertType;

	@OneToMany(() => Rule, rule => rule.alertTopic, { cascade: true })
	rules: Rule[];

	@DeleteDateColumn()
	deletedAt?: Date;

	@CreateDateColumn({ type: 'timestamp' })
	createdAt: Date;

	@ManyToOne(() => Agent, agent => agent.alerts, { nullable: false, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'agentId' })
	agent: Agent;

	@Column()
	agentId: string; // Foreign key
}

