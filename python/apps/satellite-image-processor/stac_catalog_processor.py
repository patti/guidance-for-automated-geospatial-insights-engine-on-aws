#   Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.
#
#   Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
#   with the License. A copy of the License is located at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
#   or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
#   OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
#   and limitations under the License.

import os
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from io import BytesIO
from logging import Logger
from typing import List, Optional, Dict
from urllib.parse import urlparse

import boto3
import geopandas as gpd
import rasterio
import requests
import shapely.geometry as geom
from aws_requests_auth.aws_auth import AWSRequestsAuth
from dataclasses_json import DataClassJsonMixin, config
from numpy import ndarray
from odc.stac import stac_load
from pyproj import CRS
from pystac import Item
from pystac.extensions.projection import ProjectionExtension
from pystac_client import Client
from rioxarray.merge import merge_datasets
from shapely import box, Polygon, MultiPolygon, unary_union
from shapely.geometry import shape
from xarray import Dataset
import rioxarray

from logger_utils import get_logger

STAC_URL = os.getenv("SENTINEL_API_URL")
STAC_COLLECTION = os.getenv("SENTINEL_COLLECTION")

logger: Logger = get_logger()


@dataclass
class State(DataClassJsonMixin):
	attributes: Dict[str, str] = field(metadata=config(field_name="attributes"), default=None)
	tags: Dict[str, str] = field(metadata=config(field_name="tags"), default=None)
	id: str = field(metadata=config(field_name="id"), default=None)
	polygon_id: str = field(metadata=config(field_name="polygonId"), default=None)
	timestamp: str = field(metadata=config(field_name="timestamp"), default=None)
	created_by: str = field(metadata=config(field_name="createdBy"), default=None)
	created_at: str = field(metadata=config(field_name="createdAt"), default=None)
	updated_by: Optional[str] = field(metadata=config(field_name="updatedBy"), default=None)
	updated_at: Optional[str] = field(metadata=config(field_name="updatedAt"), default=None)


@dataclass
class Result(DataClassJsonMixin):
	id: str = field(metadata=config(field_name="id"), default=None)
	status: str = field(metadata=config(field_name="status"), default=None)
	created_at: str = field(metadata=config(field_name="createdAt"), default=None)
	updated_at: Optional[str] = field(metadata=config(field_name="updatedAt"), default=None)


@dataclass
class EngineRequest(DataClassJsonMixin):
	schedule_date_time: str = field(metadata=config(field_name="scheduleDateTime"))
	coordinates: List[List[List[tuple[float, float]]]] = field(metadata=config(field_name="coordinates"), default=None)
	group_id: str = field(metadata=config(field_name="groupId"), default=None)
	group_name: str = field(metadata=config(field_name="groupName"), default=None)
	region_id: str = field(metadata=config(field_name="regionId"), default=None)
	region_name: str = field(metadata=config(field_name="regionName"), default=None)
	polygon_id: str = field(metadata=config(field_name="polygonId"), default=None)
	polygon_name: str = field(metadata=config(field_name="polygonName"), default=None)
	output_prefix: str = field(metadata=config(field_name="outputPrefix"), default=None)
	result_id: str = field(metadata=config(field_name="resultId"), default=None)
	state: Optional[State] = field(metadata=config(field_name="state"), default=None)
	latest_successful_result: Optional[Result] = field(metadata=config(field_name="latestSuccessfulResult"), default=None)


class STACCatalogProcessor:

	def __init__(
		self,
		request: EngineRequest,
	):
		self.request: EngineRequest = request
		self.polygon_list: List[Polygon] = []
		self.stac_items: Optional[List[Item]] = None
		self.previous_tif_raster: Optional[ndarray] = None
		self.bounding_box: Optional[ndarray] = None

	@staticmethod
	def _load_stac_items(schedule_date_time: str, latest_successful_result: Result, bounding_box: list[float]) -> List[Item]:

		# get the last successful run from region resource tags
		if latest_successful_result is not None and latest_successful_result.created_at is not None:
			last_successful_run = datetime.fromisoformat(latest_successful_result.created_at).strftime("%Y-%m-%d")
		else:
			# default to 5 days ago if we don't have a previous successful run
			last_successful_run = (datetime.strptime(schedule_date_time, "%Y-%m-%d") - timedelta(days=5)).strftime("%Y-%m-%d")

		time_filter = "{}/{}".format(last_successful_run, schedule_date_time)

		stac_catalog = Client.open(STAC_URL)

		stac_query = stac_catalog.search(
			bbox=bounding_box,
			datetime=time_filter,
			query={
			},
			collections=[STAC_COLLECTION],
			sortby='-properties.datetime',
			max_items=10
		)

		stac_items = list(stac_query.items())
		print(f"Found: {len(stac_items):d} items")

		if len(stac_items) == 0:
			raise Exception("No items found")

		return stac_items

	@staticmethod
	def get_previous_tif(region_id: str, result_id: str, polygon_id: str) -> Optional[Item]:
		agie_stac_endpoint = os.getenv("STAC_API_ENDPOINT")
		aws_region = os.getenv("AWS_REGION")

		aws_auth = STACCatalogProcessor.get_api_auth(agie_stac_endpoint, aws_region)

		# Retrieve the previous result stac item
		url = "{}/collections/agie-region/items/{}_{}".format(agie_stac_endpoint, region_id, result_id, polygon_id)

		# Set any required headers
		headers = {
			"Content-Type": "application/json",
		}
		stac_api_response = requests.get(url, headers=headers, auth=aws_auth, timeout=30)

		if stac_api_response.status_code != 200:
			return None

		response_data = stac_api_response.json()

		s3 = boto3.client('s3')
		try:
			bucket, key = response_data['assets']['ndvi']["href"].replace("s3://", "").split("/", 1)
			s3_get_response = s3.get_object(Bucket=bucket, Key=key)
			# Access the object's contents
			object_content = s3_get_response["Body"].read()
			with rasterio.open(BytesIO(object_content)) as src:
				# Access the image data and metadata
				raster_data = src.read()
				return raster_data
		except s3.exceptions.NoSuchKey as e:
			print(f"Error: {e}")

	@staticmethod
	def get_api_auth(endpoint: str, region: str) -> AWSRequestsAuth:
		credentials = boto3.Session().get_credentials()
		parsed_url = urlparse(endpoint)
		host = parsed_url.hostname
		auth = AWSRequestsAuth(
			aws_access_key=credentials.access_key,
			aws_secret_access_key=credentials.secret_key,
			aws_token=credentials.token,
			aws_host=host,
			aws_region=region,
			aws_service="execute-api",
		)
		return auth

	@staticmethod
	def _filter_stac_assets(result_stac_items: List[Item], polygon_list: List[Polygon], bbox: ndarray) -> Optional[Dataset]:

		# Stac item that we will load as Xarray Dataset
		stac_items = []
		stac_assets = []

		result_stac_items.sort(key=lambda x: x.properties['datetime'], reverse=True)
		combined_polygon: Optional[MultiPolygon] = None

		# default to CRS and resolution from first Item
		sentinel_epsg = ProjectionExtension.ext(result_stac_items[0]).epsg
		output_crs = CRS.from_epsg(sentinel_epsg)

		# get the bounding box of the polygon
		aoi_bbox_polygon = box(*bbox)

		# We iterate and combine all the stac item list (from the latest) to ensure it covers the input area of interest
		for item in result_stac_items:
			stac_items.append(item)
			stac_asset = stac_load(
				items=[item],
				bands=("red", "green", "blue", "nir08", "scl"),  # <-- filter on just the bands we need
				bbox=bbox.tolist(),  # <-- filters based on overall polygon boundaries
				output_crs=output_crs,
				resolution=10,
				groupby="solarday"
			)
			stac_assets.append(stac_asset)

			# Combined the multiple stac_items polygon
			item_polygon = shape(item.geometry)
			if combined_polygon is None:
				combined_polygon = item_polygon
			else:
				combined_polygon = unary_union([combined_polygon, item_polygon])

			# if our aoi is inside the combined_polygon exit from the loop
			if combined_polygon.contains(aoi_bbox_polygon):
				break

		# Merge all the loaded stac assets
		merged_dataset = merge_datasets(stac_assets)

		# clipped the stac asset to the input polygon
		clipped_dataset = merged_dataset.rio.clip(polygon_list, crs='epsg:4326')
		return clipped_dataset

	def load_stac_datasets(self) -> [Dataset, Dataset]:
		for coord in self.request.coordinates:
			for test in coord:
				self.polygon_list.append(geom.Polygon(test))

		polygon_series = gpd.GeoSeries(self.polygon_list, crs='epsg:4326')
		# Store the bounding box
		self.bounding_box = polygon_series.total_bounds

		self.stac_items = self._load_stac_items(self.request.schedule_date_time, self.request.latest_successful_result, self.bounding_box)

		stac_assets = self._filter_stac_assets(self.stac_items, self.polygon_list, self.bounding_box)

		previous_ndvi_raster = None
		if self.request.latest_successful_result is not None and self.request.latest_successful_result.id is not None:
			try:
				previous_ndvi_raster = self.get_previous_tif(self.request.region_id, self.request.latest_successful_result.id, self.request.polygon_id)
			except Exception as e:
				print(f"Error: {e}")

		return stac_assets, previous_ndvi_raster
