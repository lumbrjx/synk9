import { Injectable } from '@nestjs/common';
import { ParserSignature } from './parser-builder.service';

@Injectable()
export class PlcsimAdvancedParsersService implements ParserSignature {
	addressToModbus(address: string) {
		// Convert address to uppercase and trim whitespace
		address = address.toString().trim().toUpperCase();

		// Parse the address
		let match;

		// Input bits (I0.0-I65535.7) -> Discrete Input
		match = address.match(/^I(\d+)\.([0-7])$/);
		if (match) {
			const byte = parseInt(match[1]);
			const bit = parseInt(match[2]);
			if (byte >= 0 && byte <= 65535 && bit >= 0 && bit <= 7) {
				const modbusAddr = (byte * 8) + bit;
				return {
					type: 'Discrete Input',
					modbusAddress: modbusAddr,
					direction: 'Read',
					dataType: 'bit'
				};
			}
		}

		// Output bits (Q0.0-Q65535.7) -> Coil
		match = address.match(/^Q(\d+)\.([0-7])$/);
		if (match) {
			const byte = parseInt(match[1]);
			const bit = parseInt(match[2]);
			if (byte >= 0 && byte <= 65535 && bit >= 0 && bit <= 7) {
				const modbusAddr = (byte * 8) + bit;
				return {
					type: 'Coil',
					modbusAddress: modbusAddr,
					direction: 'Read/Write',
					dataType: 'bit'
				};
			}
		}

		// Memory bits (M0.0-M65535.7) -> Coil (offset by 524288)
		match = address.match(/^M(\d+)\.([0-7])$/);
		if (match) {
			const byte = parseInt(match[1]);
			const bit = parseInt(match[2]);
			if (byte >= 0 && byte <= 65535 && bit >= 0 && bit <= 7) {
				const modbusAddr = 524288 + (byte * 8) + bit;
				return {
					type: 'Coil',
					modbusAddress: modbusAddr,
					direction: 'Read/Write',
					dataType: 'bit'
				};
			}
		}

		// Input bytes (IB0-IB65535) -> Input Register
		match = address.match(/^IB(\d+)$/);
		if (match) {
			const num = parseInt(match[1]);
			if (num >= 0 && num <= 65535) {
				return {
					type: 'Input Register',
					modbusAddress: num,
					direction: 'Read',
					dataType: 'byte'
				};
			}
		}

		// Input words (IW0-IW65534, must be even) -> Input Register
		match = address.match(/^IW(\d+)$/);
		if (match) {
			const num = parseInt(match[1]);
			if (num >= 0 && num <= 65534 && num % 2 === 0) {
				return {
					type: 'Input Register',
					modbusAddress: num / 2,
					direction: 'Read',
					dataType: 'word'
				};
			}
		}

		// Input double words (ID0-ID65532, must be multiple of 4) -> Input Register (2 consecutive)
		match = address.match(/^ID(\d+)$/);
		if (match) {
			const num = parseInt(match[1]);
			if (num >= 0 && num <= 65532 && num % 4 === 0) {
				return {
					type: 'Input Register',
					modbusAddress: num / 2,
					direction: 'Read',
					dataType: 'dword'
				};
			}
		}

		// Output bytes (QB0-QB65535) -> Holding Register
		match = address.match(/^QB(\d+)$/);
		if (match) {
			const num = parseInt(match[1]);
			if (num >= 0 && num <= 65535) {
				return {
					type: 'REG',
					modbusAddress: num,
					direction: 'Read/Write',
					dataType: 'byte'
				};
			}
		}

		// Output words (QW0-QW65534, must be even) -> Holding Register
		match = address.match(/^QW(\d+)$/);
		if (match) {
			const num = parseInt(match[1]);
			if (num >= 0 && num <= 65534 && num % 2 === 0) {
				return {
					type: 'REG',
					modbusAddress: num / 2,
					direction: 'Read/Write',
					dataType: 'word'
				};
			}
		}

		// Output double words (QD0-QD65532, must be multiple of 4) -> Holding Register (2 consecutive)
		match = address.match(/^QD(\d+)$/);
		if (match) {
			const num = parseInt(match[1]);
			if (num >= 0 && num <= 65532 && num % 4 === 0) {
				return {
					type: 'REG',
					modbusAddress: num / 2,
					direction: 'Read/Write',
					dataType: 'dword'
				};
			}
		}

		// Memory bytes (MB0-MB65535) -> Holding Register (offset by 32768)
		match = address.match(/^MB(\d+)$/);
		if (match) {
			const num = parseInt(match[1]);
			if (num >= 0 && num <= 65535) {
				return {
					type: 'REG',
					modbusAddress: 32768 + num,
					direction: 'Read/Write',
					dataType: 'byte'
				};
			}
		}

		// Memory words (MW0-MW65534, must be even) -> Holding Register (offset by 16384)
		match = address.match(/^MW(\d+)$/);
		if (match) {
			const num = parseInt(match[1]);
			if (num >= 0 && num <= 65534 && num % 2 === 0) {
				return {
					type: 'REG',
					modbusAddress: 16384 + (num / 2),
					direction: 'Read/Write',
					dataType: 'word'
				};
			}
		}

		// Memory double words (MD0-MD65532, must be multiple of 4) -> Holding Register (offset by 16384, 2 consecutive)
		match = address.match(/^MD(\d+)$/);
		if (match) {
			const num = parseInt(match[1]);
			if (num >= 0 && num <= 65532 && num % 4 === 0) {
				return {
					type: 'REG',
					modbusAddress: 16384 + (num / 2),
					direction: 'Read/Write',
					dataType: 'dword'
				};
			}
		}

		// Data block bits (DB1.DBX0.0-DB65535.DBX65535.7) -> Coil
		// Format: %DB7.DBX0.0 should follow similar pattern as DBW
		match = address.match(/^%?DB(\d+)\.DBX(\d+)\.([0-7])$/);
		if (match) {
			const dbNum = parseInt(match[1]);
			const byte = parseInt(match[2]);
			const bit = parseInt(match[3]);
			if (dbNum >= 1 && dbNum <= 65535 && byte >= 0 && byte <= 65535 && bit >= 0 && bit <= 7) {
				// Calculate Modbus address: 10000 + (DB number - 1) * 1000 + byte * 8 + bit
				const modbusAddr = 10000 + ((dbNum - 1) * 1000) + (byte * 8) + bit;
				return {
					type: 'Coil',
					modbusAddress: modbusAddr,
					direction: 'Read/Write',
					dataType: 'bit'
				};
			}
		}

		// Data block bytes (DB1.DBB0-DB65535.DBB65535) -> Holding Register
		// Format: %DB7.DBB0 should follow similar pattern as DBW
		match = address.match(/^%?DB(\d+)\.DBB(\d+)$/);
		if (match) {
			const dbNum = parseInt(match[1]);
			const byte = parseInt(match[2]);
			if (dbNum >= 1 && dbNum <= 65535 && byte >= 0 && byte <= 65535) {
				// Calculate Modbus address: 40000 + (DB number - 1) * 1000 + byte offset
				const modbusAddr = 40000 + ((dbNum - 1) * 1000) + byte;
				return {
					type: 'REG',
					modbusAddress: modbusAddr,
					direction: 'Read/Write',
					dataType: 'byte'
				};
			}
		}

		// Data block words (DB1.DBW0-DB65535.DBW65534, must be even) -> REG
		// Format: DB7.DBW0 → 0, DB7.DBW2 → 1
		match = address.match(/^%?DB(\d+)\.DBW(\d+)$/);
		if (match) {
			const dbNum = parseInt(match[1]);
			const word = parseInt(match[2]);
			if (dbNum >= 1 && dbNum <= 65535 && word >= 0 && word <= 65534 && word % 2 === 0) {
				// Calculate Modbus address: word_offset / 2
				const modbusAddr = word / 2;
				return {
					type: 'REG',
					modbusAddress: modbusAddr,
					direction: 'Read/Write',
					dataType: 'word'
				};
			}
		}

		// Data block double words (DB1.DBD0-DB65535.DBD65532, must be multiple of 4) -> Holding Register
		// Format: %DB7.DBD0 should follow similar pattern as DBW
		match = address.match(/^%?DB(\d+)\.DBD(\d+)$/);
		if (match) {
			const dbNum = parseInt(match[1]);
			const dword = parseInt(match[2]);
			if (dbNum >= 1 && dbNum <= 65535 && dword >= 0 && dword <= 65532 && dword % 4 === 0) {
				// Calculate Modbus address: 40000 + (DB number - 1) * 1000 + dword offset / 2
				const modbusAddr = 40000 + ((dbNum - 1) * 1000) + (dword / 2);
				return {
					type: 'REG',
					modbusAddress: modbusAddr,
					direction: 'Read/Write',
					dataType: 'dword'
				};
			}
		}

		// Address not found or invalid
		return {
			error: `Invalid or unsupported address: ${address}`
		};
	}

	// Batch converter function
	convertMultipleAddresses(addresses) {
		return addresses.map(addr => ({
			plcsimAddress: addr,
			...this.addressToModbus(addr)
		}));
	}
}
