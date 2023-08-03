import boto3
import os
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext
from aws_lambda_powertools.event_handler.exceptions import NotFoundError
from aws_lambda_powertools.utilities.validation import validator
USA_EGRID_TABLE_NAME = os.environ.get('USA_EGRID_TABLE_NAME')

logger = Logger()
dynamodb = boto3.resource('dynamodb')

def __get_usa_egrid_subregion(zip_code):
    table = dynamodb.Table(USA_EGRID_TABLE_NAME)
    response = table.get_item(Key={'zip_character': zip_code})
    if 'Item' in response:
        subregions = response['Item']
        return subregions['egrid_subregion_1']
    else:
        raise NotFoundError("Unknown US zipcode")

@logger.inject_lambda_context(log_event=True)
def lambda_handler(event: dict, context: LambdaContext) -> dict:
    country: str = event['country']
    zip_code: str = event['zipcode']
    if (country == 'US'):
        return {"region": __get_usa_egrid_subregion(zip_code)}
    else:
        raise NotFoundError("Unsupported country")