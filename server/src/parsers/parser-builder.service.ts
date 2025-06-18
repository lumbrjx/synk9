import { Injectable,  Logger } from '@nestjs/common';
import { LogoParsersService } from './parsers.service';

export interface ParserSignature {
	addressToModbus(address: string): { type: string, modbusAddress: number, direction: string, dataType: string } | { error: string };
}
@Injectable()
export class ParsersService {
	getParser(plcName: string) {
		switch (plcName) {
			case ("LOGO!"):
				return new LogoParsersService()
			default:
				Logger.error(`No parsers found for: ${plcName}`)
				return ;
		}
	}
}
