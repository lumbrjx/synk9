import { Injectable, Logger, Scope } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { AppEvents } from './event-bus.interface';


export type EventKey = keyof AppEvents;

interface BusEvent<K extends EventKey> {
	type: K;
	payload: AppEvents[K];
}

@Injectable({ scope: Scope.DEFAULT })
export class EventBusService {
	private subject = new Subject<BusEvent<any>>();

	constructor() {
		Logger.log(`EventBusService instance created`, "EventBus");
	}

	emit<K extends EventKey>(type: K, payload: AppEvents[K]): void {
		console.log("sending:", type);
		this.subject.next({ type, payload })
	}

	on<K extends EventKey>(type: K): Observable<AppEvents[K]> {
		Logger.log(`Subscribed to ${type}`, "EventBus");
		return this.subject.asObservable().pipe(
			filter((event): event is BusEvent<K> => {
				return event.type === type
			}),
			map(event => event.payload)
		);
	}

}
