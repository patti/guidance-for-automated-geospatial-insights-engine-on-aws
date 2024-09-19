/*
 *  Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 */

import type { CatalogDetails, GroupDetails } from '../results/models.js';
import { EngineJobDetails, polygonProcessingDetails } from '../results/models.js';
import { RegionResource } from "../regions/models.js";

export type EventType = 'created' | 'updated' | 'deleted';

export type ResourceType = 'Polygon' | 'Group' | 'Region' | 'State' | 'Job' | 'Result' | 'Subscription';

export interface DomainEvent<T> {
	resourceType: ResourceType;
	eventType: EventType;
	id: string;
	old?: T;
	new?: T;
	error?: Error;
}

export const AWS_EVENT_BRIDGE_SCHEDULED_EVENT_SOURCE: string = 'aws.events';
export const AGIE_EVENT_SOURCE: string = 'com.aws.agie';
export const ENGINE_EVENT_SOURCE: string = 'com.aws.agie.engine';
export const SCHEDULER_EVENT_SOURCE: string = 'com.aws.agie.scheduler';

// Results module events
export const AWS_EVENT_BRIDGE_SCHEDULED_EVENT: string = 'Scheduled Event';

// CLI module events
export const CLI_EVENT_SOURCE: string = 'com.aws.agie.cli';
export const CLI_CATALOG_CREATE_EVENT = `${AGIE_EVENT_SOURCE}>results>catalog>create`;

/**
 * List of events generated by the regions module
 */
export const REGIONS_EVENT_SOURCE: string = 'com.aws.agie.regions';

export const REGIONS_GROUP_CREATED_EVENT = `${REGIONS_EVENT_SOURCE}>Group>created`;
export const REGIONS_GROUP_UPDATED_EVENT = `${REGIONS_EVENT_SOURCE}>Group>updated`;
export const REGIONS_GROUP_DELETED_EVENT = `${REGIONS_EVENT_SOURCE}>Group>deleted`;
export const REGIONS_REGION_CREATED_EVENT = `${REGIONS_EVENT_SOURCE}>Region>created`;
export const REGIONS_REGION_UPDATED_EVENT = `${REGIONS_EVENT_SOURCE}>Region>updated`;
export const REGIONS_REGION_DELETED_EVENT = `${REGIONS_EVENT_SOURCE}>Region>deleted`;
export const REGIONS_POLYGON_CREATED_EVENT = `${REGIONS_EVENT_SOURCE}>Polygon>created`;
export const REGIONS_POLYGON_UPDATED_EVENT = `${REGIONS_EVENT_SOURCE}>Polygon>updated`;
export const REGIONS_POLYGON_DELETED_EVENT = `${REGIONS_EVENT_SOURCE}>Polygon>deleted`;

/**
 * List of events generated by the results module
 */
export const RESULTS_EVENT_SOURCE: string = 'com.aws.agie.results';

export const RESULTS_RESULT_CREATED_EVENT = `${RESULTS_EVENT_SOURCE}>Result>created`;
export const RESULTS_RESULT_UPDATED_EVENT = `${RESULTS_EVENT_SOURCE}>Result>updated`;
export const RESULTS_RESULT_DELETED_EVENT = `${RESULTS_EVENT_SOURCE}>Result>deleted`;

/**
 * List of events generated by the notifications module
 */
export const NOTIFICATIONS_EVENT_SOURCE: string = 'com.aws.agie.notifications';

export const NOTIFICATIONS_SUBSCRIPTION_CREATED_EVENT = `${NOTIFICATIONS_EVENT_SOURCE}>Subscription>created`;
export const NOTIFICATIONS_SUBSCRIPTION_UPDATED_EVENT = `${NOTIFICATIONS_EVENT_SOURCE}>Subscription>updated`;
export const NOTIFICATIONS_SUBSCRIPTION_DELETED_EVENT = `${NOTIFICATIONS_EVENT_SOURCE}>Subscription>deleted`;

/**
 * List of events generated by the executor module
 */
export const EXECUTOR_EVENT_SOURCE: string = 'com.aws.agie.executor';
export const EXECUTOR_JOB_CREATED_EVENT = `${EXECUTOR_EVENT_SOURCE}>Job>created`;
export const EXECUTOR_JOB_UPDATED_EVENT = `${EXECUTOR_EVENT_SOURCE}>Job>updated`;
export const EXECUTOR_POLYGON_METADATA_CREATED_EVENT = `${EXECUTOR_EVENT_SOURCE}>PolygonMetadata>created`;

export interface catalogCreateEvent {
	account: string;
	region: string;
	source: string;
	'detail-type': string;
	detail: CatalogDetails;
}

export interface groupChangeEvent {
	account: string;
	region: string;
	source: string;
	'detail-type': string;
	detail: DomainEvent<GroupDetails>;
}

export interface regionChangeEvent {
	account: string;
	region: string;
	source: string;
	'detail-type': string;
	detail: DomainEvent<RegionResource>;
}

export interface resultsChangeEvent {
	account: string;
	region: string;
	source: string;
	'detail-type': string;
	detail: DomainEvent<EngineJobDetails>;
}

export interface polygonsProcessingEvent {
	account: string;
	region: string;
	source: string;
	'detail-type': string;
	detail: polygonProcessingDetails;
}

export type {
	catalogCreateEvent as CatalogCreateEvent,
	groupChangeEvent as GroupChangeEvent,
	polygonsProcessingEvent as PolygonsProcessingEvent,
	regionChangeEvent as RegionChangeEvent,
	resultsChangeEvent as ResultsChangeEvent,
};
