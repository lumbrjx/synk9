export interface AppEvents {
	'user:created': { id: string; name: string };
	'user:deleted': { id: string };
	'agent:created': { id: string };
	'agent:updated': { id: string };
	'agent:deleted': { id: string }
}

