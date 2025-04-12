export interface AppEvents {
	'user:created': { id: string; name: string };
	'user:deleted': { id: string };
	'agent:created': { id: string };
	'agent:updated': { id: string };
	'agent:deleted': { id: string }

	'sensor:created': { id: string, label: string, start_register: number, end_register: number };
	'sensor:updated': { id: string, label: string, start_register: number, end_register: number };
	'sensor:deleted': { id: string }
}

