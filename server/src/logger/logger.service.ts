import { Inject, Injectable } from '@nestjs/common';
import { InfluxDB, Point } from "@influxdata/influxdb-client"
import { INFLUX_CLIENT } from 'src/connection/constants';


@Injectable()
export class LoggerService {
	private BUCKET = 'sensors_logs'
	private ORG = 'myorg'
	constructor(
		@Inject(INFLUX_CLIENT) private readonly influx: InfluxDB
	) {

	}
	async recordLogs(jsonData: any) {
		const point = new Point(jsonData.sensor_id);

		for (const [key, value] of Object.entries(jsonData)) {
			if (key !== 'sensor_id' && key !== 'time') {
				if (typeof value === 'boolean') {
					point.booleanField(key, value);
				} else if (typeof value === 'string') {
					point.stringField(key, value);
				} else if (typeof value === 'number') {
					point.floatField(key, value);
				}
			}
		}

		const ts = new Date(jsonData.time);
		point.timestamp(isNaN(ts.getTime()) ? new Date() : ts);
		this.influx.getWriteApi(this.ORG, this.BUCKET, 'ns').writePoint(point)
	}
	async getLogs(sensor_id: string, time: string): Promise<any[]> {
		const queryClient = this.influx.getQueryApi(this.ORG)

		const fluxQuery = `
        from(bucket: "${this.BUCKET}")
            |> range(start: -${time}m)
            |> filter(fn: (r) => r._measurement == "${sensor_id}")
            |> pivot(rowKey:["_time"], 
                    columnKey: ["_field"], 
                    valueColumn: "_value")
    `

		return new Promise((resolve, reject) => {
			const allLogs: any[] = []

			queryClient.queryRows(fluxQuery, {
				next: (row, tableMeta) => {
					const rowData = tableMeta.toObject(row)
					const logEntry = {
						time: new Date(rowData['_time']),
						...Object.keys(rowData)
							.filter(key =>
								!key.startsWith('_') &&
								rowData[key] !== null &&
								rowData[key] !== undefined &&
								rowData[key] !== ''
							)
							.reduce((acc, key) => ({
								...acc,
								[key]: rowData[key]
							}), {})
					}

					if (Object.keys(logEntry).length > 1) {
						allLogs.push(logEntry)
					}
				},
				error: (error) => {
					console.error('Error querying data:', error)
					reject(error)
				},
				complete: () => {
					resolve(allLogs)
				},
			})
		})
	}
}
