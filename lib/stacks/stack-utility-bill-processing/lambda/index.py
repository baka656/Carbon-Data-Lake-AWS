import re
import os
import json
import time
import boto3
import logging
import csv
import io
from datetime import datetime

dynamodb = boto3.client('dynamodb', region_name="us-east-1")


LOGGER = logging.getLogger()
LOGGER.setLevel(logging.INFO)

LOGGER.info('Loading function')
LOGGER.info('Boto3 Version: {0}'.format(boto3.__version__))

s3 = boto3.client('s3')
textract = boto3.client('textract')
awslambda = boto3.client('lambda')
RAW_DATA_BUCKET = os.environ.get('RAW_BUCKET_NAME')
LANDING_BUCKET_NAME = os.environ.get('LANDING_BUCKET_NAME')
TRANSFORMED_DATA_BUCKET = os.environ.get('TRANSFORMED_BUCKET_NAME')


# Query Textract
def query_Textract(bills, query):
    # bills is a list of keys in S3 that are our bills to process
    # query is a QueriesConfig object for textract.start_document_analysis()
    # returns a list of Textract jobs to be be retrieved when complete
    
    jobs = []
    for bill in bills:
        textract_response = textract.start_document_analysis(
                DocumentLocation={
                    'S3Object': {
                        'Bucket': RAW_DATA_BUCKET,
                        'Name': bill
                    }
                },
                FeatureTypes=['QUERIES'],
                QueriesConfig=query
            )
        
        job = textract_response['JobId']
        jobs.append(job)
        time.sleep(.1) # hardcoded throttling to avoid tripping Textract Quotas
    
    LOGGER.info('Querying {0} bills in Textract'.format(len(jobs)))
    return jobs


# Retrieve Textract Query Results
def retrieve_Textract_query_results(jobids):
    # jobids is a list of pending Textract document analysis job IDs
    # returns a clean dict object of each query and returned result
    
    results = []
    for job in jobids:
        textract_response = textract.get_document_analysis(JobId=job)
        while(textract_response["JobStatus"] == "IN_PROGRESS"):
            time.sleep(1)
            textract_response = textract.get_document_analysis(JobId=job)
    
        lookup = ["QUERY", "QUERY_RESULT"]
        
        # one line filter function to just have queries and results to process
        queryResults = [b for b in textract_response["Blocks"] if b['BlockType'] in lookup]
        
        results.append(unpack_query(queryResults))
    
    LOGGER.info('Successfully retrieved {0} queries from Textract'.format(len(jobids)))
    return results


def unpack_query(results):
    # Helper function for retrieve_Textract_query_results
    # unpacks a list of queries and responses from Textract API
    
    i = 0
    data = {}
    while i < len(results):
        data[results[i]['Query']['Alias']] = results[i+1]['Text']
        i = i+2
    
    # Try block to catch multiple datetime formats, you may need to add more formats here
    for schema in ['%B %d,%Y', '%B %d, %Y']:
        try:
            data['bill_date'] = datetime.strptime(data['bill_date'],schema).strftime('%Y-%m') # saves as YYYY-MM-DD
        except:
            pass
        
    return data


# Transform data
def transform_data(data):
    # data is a list of cleaned queries returned from Textract
    # returns a list of transformed data objects as JSON ready to be written to our S3 bucket
    
    TransformedData = []
    x=100
    for entry in data:
        entry['kwh_usage'] = int(float(entry['kwh_usage']) / 33.7)
        event_id = '{0}-{1}-{2}'.format(entry['utility_provider_name'],
                                        entry['es_id'],
                                        entry['bill_date']
                                        )
        zipcode = re.search("\d{5}\-?\d{0,4}", entry['utility_provider_address']).group()
        activity = awslambda.invoke(FunctionName='GridRegionSelector',
                                    Payload=json.dumps({'country':'US','zipcode':zipcode}),
                                    InvocationType='RequestResponse'
                                    )
        activity = json.loads(activity['Payload'].read().decode())
        TransformedData.append({
            "activity_event_id": event_id,
            "asset_id": "utility-bill-" + str(x),
            "origin_measurement_timestamp": entry['bill_date'],
            "geo": [40.4406, -79.9959],
            "supplier": entry['utility_provider_name'],
            "scope": 2,
            "category": "grid-region-location-based",
            "activity": activity['region'],
            "raw_data": entry['kwh_usage'],
            "units": "gal"
            }
        )
        x = x + 1;
    LOGGER.info('Successfull transformed {0} bills'.format(len(data)))
    return TransformedData


# Write json bills to transformed s3 bucket
def write_json_bills_to_transformed_s3(bills):
    
    for bill in bills:
        filename = "{0}.json".format(bill['activity_event_id'])
        
        s3.put_object(Body=json.dumps(bill).replace('\n',''),
                      Bucket=TRANSFORMED_DATA_BUCKET,
                      Key=filename
                     )
                     
        LOGGER.info('Wrote {0} to {1}/'.format(filename,TRANSFORMED_DATA_BUCKET))
    
    LOGGER.info('Wrote {0} bills to {1}/'.format(len(bills),TRANSFORMED_DATA_BUCKET))
    return

#write csv bills to landing s3 bucket
def write_csv_bills_to_landing_s3(bills):
    csv_headers = bills[0].keys()
    csv_buffer = io.StringIO()
    writer = csv.DictWriter(csv_buffer, fieldnames=csv_headers)
    writer.writeheader()
    
    for bill in bills:
        writer.writerow(bill)
    
    # Upload CSV data to S3
    s3.put_object(Body=csv_buffer.getvalue().encode('utf-8'), 
                   Bucket=LANDING_BUCKET_NAME, 
                   Key="carbon-data-lake-input-data.csv")
        
    
    LOGGER.info('Wrote {0} bills to {1}/'.format(len(bills),LANDING_BUCKET_NAME))
    return 

def get_last_processed_time():
    LOGGER.info('in get function');
    try:
        table="LastProcessedTimeTable"
        response = dynamodb.get_item(
            TableName = table,
            Key={ 
                'id' : {'S' : 'last_processed_time'}
            }
        )
        LOGGER.info(response);
        return int(response['Item']['timestamp']['N'])
    except Exception as e:
        LOGGER.info(e);
        return 0

def update_last_processed_time(timestamp):
    try:
        dynamodb.update_item(
            TableName='LastProcessedTimeTable',
            Key={'id': {'S': 'last_processed_time'}},  # Use the correct primary key value 'id'
            UpdateExpression='SET #ts = :val',  # Update the 'timestamp' attribute with a new value
            ExpressionAttributeValues={':val': {'N': str(timestamp)}},
            ExpressionAttributeNames={'#ts': 'timestamp'},  # Use ExpressionAttributeNames to handle reserved words like 'timestamp'
        )
    except Exception as e:
        LOGGER.info('in update exception');
        dynamodb.put_item(
            TableName='LastProcessedTimeTable',
            Item={'id': {'S': 'last_processed_time'}, 'timestamp': {'N' : str(timestamp)}}
        )

def lambda_handler(event, context):
    current_time = int(time.time())
    last_processed_time = get_last_processed_time()
    LOGGER.info(current_time)
    LOGGER.info(last_processed_time)
    if current_time - last_processed_time >= 60:
        update_last_processed_time(current_time)
        time.sleep(60)
        resp = s3.list_objects_v2(Bucket=RAW_DATA_BUCKET)
        bills = [b['Key'] for b in resp['Contents'] if '.pdf' in b['Key']]

        query = {
                    "Queries":[
                        {
                            "Text": "What is this customer's name?",
                            "Alias": "customer_name"
                        },
                        {
                            "Text": "What is this customer's address?",
                            "Alias": "customer_address"
                        },
                        {
                            "Text": "What is the meter ID?",
                            "Alias": "es_id"
                        },
                        {
                            "Text": "How many kWhs were used?",
                            "Alias": "kwh_usage"
                        },
                        {
                            "Text": "What is the statement date?",
                            "Alias": "bill_date"
                        },
                        {
                            "Text": "What's the company name?",
                            "Alias": "utility_provider_name"
                        },
                        {
                            "Text": "What's the address at the top of the bill?",
                            "Alias": "utility_provider_address"
                        },
                    ]

                }

        TextractJobs = query_Textract(bills, query)

        ExtractedData = retrieve_Textract_query_results(TextractJobs)

        TransformedBills = transform_data(ExtractedData)

        write_json_bills_to_transformed_s3(TransformedBills)

        write_csv_bills_to_landing_s3(TransformedBills)

    return {'status':'Success!'}
