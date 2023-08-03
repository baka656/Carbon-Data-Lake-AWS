import json
import boto3
import os
import csv
import codecs
import sys

s3 = boto3.resource('s3')
dynamodb = boto3.resource('dynamodb')

csvFilePath = r'power_profiler_zipcode_tool_2018_3_09_20_v9.csv'
tableName = os.environ['USA_EGRID_TABLE_NAME']

def on_event(event, context):
   print("Loading eGRID data")
   print(event)
   request_type = event['RequestType']
   # We only populate the DDB table when the stack is created for the first time
   if request_type == 'Create':
      seen = set()
      with open(csvFilePath, encoding='utf-8-sig') as csvf:
         batch_size = 100
         batch = []

         for row in csv.DictReader(csvf):
            zipcode = row['zip_character']
            if zipcode in seen:
               print("Duplicate value found :", zipcode)
            else:
               seen.add(zipcode)
               if len(batch) >= batch_size:
                  write_to_dynamo(batch)
                  batch.clear()
               batch.append(row)

         if batch:
            write_to_dynamo(batch)

   return {
      'statusCode': 200,
      'body': json.dumps('Uploaded to DynamoDB Table')
   }


def write_to_dynamo(rows):
   table = dynamodb.Table(tableName)

   with table.batch_writer() as batch:
      for i in range(len(rows)):
         batch.put_item(
            Item=rows[i]
         )