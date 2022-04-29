import * as cdk from 'aws-cdk-lib';
import { CarbonLakeQuickStartApiStack } from './api/carbonlake-api-stack';
import { CarbonlakeQuickstartPipelineStack } from './pipeline/carbonlake-qs-pipeline-stack';
import { CarbonlakeQuickstartDataLineageStack } from './data-lineage/carbonlake-data-lineage-stack';
import { CarbonlakeQuickstartSharedResourcesStack } from './shared-resources/carbonlake-qs-shared-resources-stack';
import { CarbonLakeDataCompactionPipelineStack } from './data-compaction-pipeline/carbonlake-qs-data-compaction-pipeline';

export class CarbonlakeQuickstartStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // QS1 --> Create the carbonlake shared resource stack
    const sharedResources = new CarbonlakeQuickstartSharedResourcesStack(scope, "CarbonlakeSharedResourceStack");
    
    // QS2 --> Create the carbonlake data lineage stack
    const dataLineage = new CarbonlakeQuickstartDataLineageStack(scope, "CarbonlakeDataLineageStack");

    // QS3 --> Create the carbonlake data pipeline stack
    // carbonlake orchestration pipeline stack - Amazon Step Functions
    // TODO: As there are created, need to add the sfn components to the pipeline stack
    const pipeline = new CarbonlakeQuickstartPipelineStack(scope, "CarbonlakePipelineStack", {
      dataLineageFunction: dataLineage.inputFunction,
      rawBucket: sharedResources.carbonlakeRawBucket,
      transformedBucket: sharedResources.carbonlakeTransformedBucket,
      enrichedBucket: sharedResources.carbonlakeEnrichedBucket,
      uniqueDirectory: 'test-unique-directory' // TODO: this is generated by the pipeline
    });
  
    //const dataPipeline = new CarbonDataPipelineStack(app, "CarbonlakeDataPipelineStack");
    const dataCompactionPipeline = new CarbonLakeDataCompactionPipelineStack(scope, "CarbonLakeDataCompactionPipelineStack", {
      enrichedBucket: sharedResources.carbonlakeEnrichedBucket
    }); //placeholder to test deploying analytics pipeline stack: contains glue jobs that run daily at midnight
    

    // QS5 --> Create the carbonlake quicksight stack
  const quicksight = new CarbonlakeQuicksightStack(scope, "CarbonlakeQuicksightStack");

    // QS7 --> Create the carbonlake web stack
    const api = new CarbonLakeQuickStartApiStack(scope, "CarbonLakeApiStack", {
      calculatorOutputTableRef: pipeline.calculatorOutputTable
    });

    // QS8 --> Create the carbonlake forecast stack
    //const forecast = new CarbonlakeForecastStack(app, "CarbonlakeForecastStack");

    // TODO --> Creat the carbonlake monitoring and observability stack
    
  }
}
