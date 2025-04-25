export interface AppEvents {
	'user:created': { id: string; name: string };
	'user:deleted': { id: string };
	'agent:created': { id: string };
	'agent:updated': { id: string };
	'agent:deleted': { id: string }
	'agent:cleanup': { id: string }
	'agent:sync': { id: string, label: string, start_register: number, end_register: number, agentFingerprint:string };

	'sensor:created': { id: string, label: string, start_register: number, end_register: number, agentFingerprint:string };

	'sensor:updated': { id: string, label: string, start_register: number, end_register: number , agentFingerprint:string};
	'sensor:deleted': { id: string }

	'process:created': { id: string, agentId: string };
	'process:cycle-done': { id: string, agentId: string };
	'process:updated': { id: string, agentId: string };
	'process:deleted': { id: string };
	'process:kill': { id: string };

	'step:valid': { id: string, stepId: string, agentId: string };
	'step:running': { id: string, steps: any, agentId: string };

	'sensor:process-state-updated': { label: string, value: number, agentId: string};
}

