import { Injectable } from '@nestjs/common';

@Injectable()
export class ParsersService {
	logoToModbus(address) {
		// Convert address to uppercase and trim whitespace
		address = address.toString().trim().toUpperCase();

		// Parse the address
		let match;

		// Digital Inputs (I1-I24) -> Discrete Input 1-24
		match = address.match(/^I(\d+)$/);
		if (match) {
			const num = parseInt(match[1]);
			if (num >= 1 && num <= 24) {
				return {
					type: 'Discrete Input',
					modbusAddress: num,
					direction: 'Read',
					dataType: 'bit'
				};
			}
		}

		// Outputs/Coils (Q1-Q20) -> Coil 8193-8212
		match = address.match(/^Q(\d+)$/);
		if (match) {
			const num = parseInt(match[1]);
			if (num >= 1 && num <= 20) {
				return {
					type: 'Coil',
					modbusAddress: 8192 + num,
					direction: 'Read/Write',
					dataType: 'bit'
				};
			}
		}

		// Memory bits (M1-M64) -> Coil 8257-8320
		match = address.match(/^M(\d+)$/);
		if (match) {
			const num = parseInt(match[1]);
			if (num >= 1 && num <= 64) {
				return {
					type: 'Coil',
					modbusAddress: 8256 + num,
					direction: 'Read/Write',
					dataType: 'bit'
				};
			}
		}

		// Variable bits (V0.0-V850.7) -> Coil 1-6808
		match = address.match(/^V(\d+)\.(\d+)$/);
		if (match) {
			const byte = parseInt(match[1]);
			const bit = parseInt(match[2]);
			if (byte >= 0 && byte <= 850 && bit >= 0 && bit <= 7) {
				const modbusAddr = (byte * 8) + bit + 1;
				if (modbusAddr <= 6808) {
					return {
						type: 'Coil',
						modbusAddress: modbusAddr - 1,
						direction: 'Read/Write',
						dataType: 'bit'
					};
				}
			}
		}

		// Analog Inputs (AI1-AI8) -> Input Register 1-8
		match = address.match(/^AI(\d+)$/);
		if (match) {
			const num = parseInt(match[1]);
			if (num >= 1 && num <= 8) {
				return {
					type: 'Input Register',
					modbusAddress: num,
					direction: 'Read',
					dataType: 'word'
				};
			}
		}

		// Variable Words (VW0-VW848) -> Holding Register 1-425
		match = address.match(/^VW(\d+)$/);
		if (match) {
			const num = parseInt(match[1]);
			if (num >= 0 && num <= 848 && num % 2 === 0) { // Must be even numbers
				const modbusAddr = (num / 2) + 1;
				if (modbusAddr <= 425) {
					return {
						type: 'REG',
						modbusAddress: modbusAddr - 1,
						direction: 'Read/Write',
						dataType: 'word'
					};
				}
			}
		}

		// Analog Outputs (AQ1-AQ8) -> Holding Register 513-520
		match = address.match(/^AQ(\d+)$/);
		if (match) {
			const num = parseInt(match[1]);
			if (num >= 1 && num <= 8) {
				return {
					type: 'REG',
					modbusAddress: 512 + num,
					direction: 'Read/Write',
					dataType: 'word'
				};
			}
		}

		// Analog Memory (AM1-AM64) -> Holding Register 529-592
		match = address.match(/^AM(\d+)$/);
		if (match) {
			const num = parseInt(match[1]);
			if (num >= 1 && num <= 64) {
				return {
					type: 'REG',
					modbusAddress: 528 + num,
					direction: 'Read/Write',
					dataType: 'word'
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
			logoAddress: addr,
			...this.logoToModbus(addr)
		}));
	}

}
