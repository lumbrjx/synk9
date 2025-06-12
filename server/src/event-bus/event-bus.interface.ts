export interface AppEvents {
	'user:created': { id: string; name: string };
	'user:deleted': { id: string };
	'agent:created': { id: string };
	'agent:updated': { id: string, locked?: boolean };
	'agent:deleted': { id: string }
	'agent:cleanup': { id: string }
	'agent:disconnected': { processId: string }
	'agent:sync': { id: string, label: string, start_register: number, end_register: number, agentFingerprint: string };

	'sensor:created': {
		id: string,
		label: string,
		start_register: number,
		end_register: number,
		register: string,
		agentFingerprint: string,
		s_type: "general" | "sensor"
	};

	'sensor:updated': {
		id: string,
		label: string,
		start_register: number,
		register: string,
		end_register: number,
		agentFingerprint: string,
		s_type: "general" | "sensor"
	};
	'sensor:deleted': { id: string }

	'process:created': { id: string, agentId: string };
	'process:cycle-done': { id: string, agentId: string };
	'process:updated': { id: string, agentId: string };
	'process:deleted': { id: string };
	'process:kill': { id: string };

	'step:valid': { id: string, stepId: string, agentId: string };
	'alert:alert': { id: string, agentId: string, data: any };
	'step:running': { id: string, data: any, agentId: string };

	'sensor:process-state-updated': { label: string, value: number, agentId: string, sensor_id: string, register: string };
}

