import { CreateZone, EditZone, Zone, ZoneList } from './schemas.js';

export const zonePostRequestExample: CreateZone = {
	name: 'Field 1',
	scheduleExpression: 'rate(5 days)',
	scheduleExpressionTimezone: 'Australia/Perth',
	boundary: [
		[-104.5079674, 39.9194752],
		[-104.4894065, 39.9193435],
		[-104.4893912, 39.9122295],
		[-104.5078877, 39.9123941],
		[-104.5079674, 39.9194752],
	],
};

export const zonePatchRequestExample1: EditZone = zonePostRequestExample;
export const zonePatchRequestExample2: EditZone = {
	scheduleExpression: 'rate(5 days)',
	scheduleExpressionTimezone: 'Australia/Perth',
	tags: {
		tier: 'GOLD',
	},
};

/**
 * Example after initial creation
 */
export const zoneResourceExample1: Zone = {
	id: '76ghytgt5',
	...zonePostRequestExample,
	regionId: 'htgdjajdhja',
	area: 175,
	createdAt: '2022-08-10T23:55:20.322Z',
	createdBy: 'someone@somewhere.com',
};

export const zoneResourceExample2: Zone = {
	id: '0980yht42',
	name: 'Field 2',
	regionId: 'htgdjajdhja',
	boundary: [
		[-104.4895628, 39.9390518],
		[-104.492009, 39.938295],
		[-104.4926527, 39.9376369],
		[-104.494026, 39.9378015],
		[-104.4971159, 39.9367485],
		[-104.4993046, 39.9345767],
		[-104.4992188, 39.9332933],
		[-104.4999483, 39.931615],
		[-104.4996908, 39.926909],
		[-104.4895199, 39.9268103],
		[-104.4895628, 39.9390518],
	],
	area: 655,
	createdAt: '2022-08-10T23:55:20.322Z',
	createdBy: 'someone@somewhere.com',
	updatedAt: '2022-08-12T07:34:23.132Z',
	updatedBy: 'someoneelse@somewhere.com',
};

export const zoneListResource: ZoneList = {
	zones: [zoneResourceExample1, zoneResourceExample2],
	pagination: {
		token: zoneResourceExample1.id,
		count: 2,
	},
};
