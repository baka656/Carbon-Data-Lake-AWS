import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import {
    aws_dynamodb as dynamodb,
    aws_iam as iam,
    aws_s3 as s3,
    custom_resources as cr,
    CustomResource,
    Duration,
    RemovalPolicy,
    StackProps
} from 'aws-cdk-lib';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications'
import { Construct } from "constructs";
import { CdlS3 } from '../../constructs/construct-cdl-s3-bucket/construct-cdl-s3-bucket'
import * as logs from "aws-cdk-lib/aws-logs";
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';


interface UtilityBillStackProps extends StackProps {
    landingBucket: s3.Bucket
  }
export class UtilityBillStack extends cdk.Stack {

  public rawBucket: s3.Bucket;
  public landingBucket: s3.Bucket;
  public transformedBucket: s3.Bucket;
  constructor(scope: Construct, id: string, props: UtilityBillStackProps) {
    super(scope, id, props);

    // Create raw bucket to upload pdf bills
    this.rawBucket = new CdlS3(this, 'raw-data-', {
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        cors: [
          {
            allowedMethods: [
              s3.HttpMethods.GET,
              s3.HttpMethods.POST,
              s3.HttpMethods.PUT,
              s3.HttpMethods.DELETE,
              s3.HttpMethods.HEAD,
            ],
            exposedHeaders: ['x-amz-server-side-encryption', 'x-amz-request-id', 'x-amz-id-2', 'ETag'],
            maxAge: 3000,
            allowedOrigins: ['*'],
            allowedHeaders: ['*'],
          },
        ],
      })

      //Create transformed bucket to store json files
      this.transformedBucket = new CdlS3(this, 'transformed-data-', {
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        cors: [
          {
            allowedMethods: [
              s3.HttpMethods.GET,
              s3.HttpMethods.POST,
              s3.HttpMethods.PUT,
              s3.HttpMethods.DELETE,
              s3.HttpMethods.HEAD,
            ],
            exposedHeaders: ['x-amz-server-side-encryption', 'x-amz-request-id', 'x-amz-id-2', 'ETag'],
            maxAge: 3000,
            allowedOrigins: ['*'],
            allowedHeaders: ['*'],
          },
        ],
      })
    this.landingBucket = props.landingBucket

    //--- Grid Selector Lambda ---//
    const usaEgridTable = new dynamodb.Table(this, "GridRegiondSelectorEgridTable", {
        partitionKey: {name: "zip_character", type: dynamodb.AttributeType.STRING},
        removalPolicy: RemovalPolicy.DESTROY,
        tableName: "GridRegionSelectorEgridTable",

        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST
    });

    //---last processed time table--//
    const lastProcessedTimeTable = new dynamodb.Table(this, "LastProcessedTimeTable", {
        partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
        removalPolicy: RemovalPolicy.DESTROY,
        tableName: "LastProcessedTimeTable",
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST
    });
    // Lambda Layer for aws_lambda_powertools (dependency for the lambda function)
    const powertoolsLayer = lambda.LayerVersion.fromLayerVersionArn(this, "GridRegiondSelectorPowertoolsLayer",
    `arn:aws:lambda:${this.region}:017000801446:layer:AWSLambdaPowertoolsPython:33`
    );

    const selectorFunction = new lambda.Function(this, 'GridRegiondSelectorFunction', {
        functionName: 'GridRegionSelector',
        runtime: lambda.Runtime.PYTHON_3_9,
        // inline the code because it's easier to deploy via Event Engine
        code: lambda.Code.fromAsset('lib/stacks/stack-utility-bill-processing/selector'),
        handler: "index.lambda_handler",
        layers: [powertoolsLayer],
        environment: {
            USA_EGRID_TABLE_NAME: usaEgridTable.tableName,
            POWERTOOLS_SERVICE_NAME: "grid_region_selector",
            POWERTOOLS_LOGGER_LOG_EVENT: "true"
        }
    });
    usaEgridTable.grantReadData(selectorFunction);

    //Load reference data
    const dataLoader = new lambda.Function(this, 'GridRegiondSelectorDataLoaderFunction', {
        functionName: "GridRegionSelectorDataLoader",
        runtime: lambda.Runtime.PYTHON_3_9,
        code: lambda.Code.fromAsset('lib/stacks/stack-utility-bill-processing/dataloader'),
        handler: "data_loader.on_event",
        timeout: Duration.minutes(5),
        environment: {
            USA_EGRID_TABLE_NAME: usaEgridTable.tableName,
        }
    });

    usaEgridTable.grantWriteData(dataLoader);
    const provider = new cr.Provider(this, 'Provider', {
        onEventHandler: dataLoader,
        logRetention: logs.RetentionDays.ONE_DAY
    });
    const resource = new CustomResource(this, 'Resource', {
        serviceToken: provider.serviceToken,
    });
    
    const layer = new lambda.LayerVersion(this, 'Boto3Layer', {
        code: lambda.Code.fromAsset('lib/layers/boto_3_lambda_layer.zip'),
        compatibleRuntimes: [lambda.Runtime.PYTHON_3_9],
        license: 'Apache-2.0',
        description: 'A layer with the latest version of Boto3',
    });

    const dynamoDbTableArn = lastProcessedTimeTable.tableArn; // Replace with the actual DynamoDB table ARN

    const dynamoDbPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      resources: [dynamoDbTableArn],
    });

    // Define Lambda function
    const lambdaFunction = new lambda.Function(this, 'ProcessPDFLambda', {
      functionName: 'UtilityBillExtractorNew',
      runtime: lambda.Runtime.PYTHON_3_9,
      layers: [layer, powertoolsLayer],
      code: lambda.Code.fromAsset('lib/stacks/stack-utility-bill-processing/lambda'),
      handler: 'index.lambda_handler',
      timeout: Duration.minutes(5),
      environment: {
        RAW_BUCKET_NAME: this.rawBucket.bucketName,
        TRANSFORMED_BUCKET_NAME: this.transformedBucket.bucketName,
        LANDING_BUCKET_NAME: this.landingBucket.bucketName
      },
    });

    lambdaFunction.addToRolePolicy(dynamoDbPolicy);
    lastProcessedTimeTable.grantReadWriteData(lambdaFunction);

    // Grant necessary permissions to Lambda function
    this.rawBucket.grantReadWrite(lambdaFunction);
    this.transformedBucket.grantWrite(lambdaFunction);
    this.landingBucket.grantReadWrite(lambdaFunction);

    lambdaFunction.role?.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonTextractFullAccess'));
    selectorFunction.grantInvoke(lambdaFunction);

    // Set up event source for the Lambda function to be triggered when a new object is created in the raw bucket
    this.rawBucket.addEventNotification(
        s3.EventType.OBJECT_CREATED,
        new s3n.LambdaDestination(lambdaFunction)
      );
}
}
