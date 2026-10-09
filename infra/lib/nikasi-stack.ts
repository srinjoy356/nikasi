import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as apigw from 'aws-cdk-lib/aws-apigatewayv2';
import * as integ from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';
import * as path from 'path';

const MAX_LEVEL = 3; // Junior Engineer -> Assistant -> Executive -> Ward Commissioner

export class NikasiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, 'Photos', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
      }],
    });

    const table = new dynamodb.Table(this, 'Reports', {
      partitionKey: { name: 'reportId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const topic = new sns.Topic(this, 'Escalations', { displayName: 'Nikasi escalations' });
    const alertEmail = this.node.tryGetContext('alertEmail');
    if (alertEmail) topic.addSubscription(new subs.EmailSubscription(alertEmail));

    const code = lambda.Code.fromAsset(path.join(__dirname, '../../backend/build'));
    const common = {
      runtime: lambda.Runtime.PYTHON_3_12,
      code,
      environment: {
        TABLE: table.tableName,
        BUCKET: bucket.bucketName,
        TOPIC_ARN: topic.topicArn,
        POWERTOOLS_SERVICE_NAME: 'nikasi',
      },
    };

    // Open-weight vision model (SmolVLM2 via llama.cpp) running in Lambda behind an IAM-protected URL.
    const vlmFn = new lambda.DockerImageFunction(this, 'VisionModelFn', {
      code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, '../../backend/vlm'), { platform: Platform.LINUX_AMD64 }),
      architecture: lambda.Architecture.X86_64,
      memorySize: 10240, timeout: cdk.Duration.minutes(5),
    });
    const vlmUrl = vlmFn.addFunctionUrl({ authType: lambda.FunctionUrlAuthType.AWS_IAM });

    const tasksFn = new lambda.Function(this, 'TasksFn', {
      ...common, handler: 'nikasi.tasks.handler',
      timeout: cdk.Duration.minutes(5), memorySize: 512,
      environment: { ...common.environment, VLM_URL: vlmUrl.url },
    });
    vlmUrl.grantInvokeUrl(tasksFn);
    vlmFn.grantInvoke(tasksFn);
    new events.Rule(this, 'KeepVisionWarm', {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5)),
      targets: [new targets.LambdaFunction(tasksFn, { event: events.RuleTargetInput.fromObject({ action: 'warm' }) })],
    });
    table.grantReadWriteData(tasksFn);
    bucket.grantRead(tasksFn);
    topic.grantPublish(tasksFn);
    tasksFn.addToRolePolicy(new iam.PolicyStatement({ actions: ['rekognition:DetectLabels'], resources: ['*'] }));

    // ---- the workflow: triage -> dispatch -> fix -> verify, escalating on every miss ----
    const call = (id: string, payload: Record<string, unknown>, resultPath: string) =>
      new tasks.LambdaInvoke(this, id, {
        lambdaFunction: tasksFn, payload: sfn.TaskInput.fromObject(payload),
        payloadResponseOnly: true, resultPath,
      }).addRetry({ errors: ['Lambda.ServiceException', 'Lambda.TooManyRequestsException', 'States.TaskFailed'], maxAttempts: 2, interval: cdk.Duration.seconds(2) });

    const wait = (id: string, phase: string, secondsPath: string) =>
      new tasks.LambdaInvoke(this, id, {
        lambdaFunction: tasksFn, integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
        payload: sfn.TaskInput.fromObject({
          action: 'registerWait', 'reportId.$': '$.reportId', phase,
          token: sfn.JsonPath.taskToken, 'timeoutSeconds.$': secondsPath, 'level.$': '$.level',
        }),
        taskTimeout: sfn.Timeout.at(secondsPath), resultPath: '$.callback',
      });

    const rid = { 'reportId.$': '$.reportId' };
    const triage = call('Triage photo', { action: 'triage', ...rid, 'slaScale.$': '$.slaScale' }, '$.triage');
    const init = new sfn.Pass(this, 'Owner: Junior Engineer', { result: sfn.Result.fromNumber(0), resultPath: '$.level' });
    const waitDispatch = wait('Wait for officer dispatch', 'dispatch', '$.triage.dispatchSla');
    const waitFix = wait('Wait for crew fix', 'fix', '$.triage.fixSla');
    const verify = call('Verify after-photo', { action: 'verify', ...rid }, '$.verification');
    const closeOk = call('Close: verified', { action: 'close', ...rid, outcome: 'verified' }, '$.closed');
    const closeFail = call('Close: unresolved', { action: 'close', ...rid, outcome: 'failed' }, '$.closed');
    const done = new sfn.Succeed(this, 'Done');

    const escalate = (id: string, reason: string) =>
      call(id, { action: 'escalate', ...rid, reason, 'level.$': '$.level' }, '$.level');
    const escDispatch = escalate('Escalate: no dispatch in time', 'Nobody dispatched a crew within the SLA');
    const escFix = escalate('Escalate: fix overdue', 'The crew did not submit a fix within the SLA');
    const escVerify = escalate('Escalate: fix rejected', 'The after-photo failed verification');

    const room = (next: sfn.IChainable, id: string) =>
      new sfn.Choice(this, id)
        .when(sfn.Condition.numberLessThan('$.level', MAX_LEVEL), next)
        .otherwise(closeFail);

    waitDispatch.addCatch(room(escDispatch, 'Can escalate further? (dispatch)'), { errors: ['States.Timeout'], resultPath: '$.error' });
    waitFix.addCatch(room(escFix, 'Can escalate further? (fix)'), { errors: ['States.Timeout'], resultPath: '$.error' });
    escDispatch.next(waitDispatch);
    escFix.next(waitFix);
    escVerify.next(waitFix);
    closeOk.next(done);
    closeFail.next(done);

    const verified = new sfn.Choice(this, 'Fix verified?')
      .when(sfn.Condition.booleanEquals('$.verification.verified', true), closeOk)
      .otherwise(room(escVerify, 'Can escalate further? (verify)'));

    triage.next(init).next(waitDispatch).next(waitFix).next(verify).next(verified);

    const sfnLogs = new logs.LogGroup(this, 'WorkflowLogs', { retention: logs.RetentionDays.ONE_WEEK, removalPolicy: cdk.RemovalPolicy.DESTROY });
    const machine = new sfn.StateMachine(this, 'Workflow', {
      stateMachineName: 'nikasi-ticket-workflow',
      definitionBody: sfn.DefinitionBody.fromChainable(triage),
      timeout: cdk.Duration.days(8),
      logs: { destination: sfnLogs, level: sfn.LogLevel.ALL },
    });

    // ---- the HTTP API ----
    const apiFn = new lambda.Function(this, 'ApiFn', {
      ...common, handler: 'nikasi.api.handler',
      timeout: cdk.Duration.seconds(29), memorySize: 512,
      environment: { ...common.environment, STATE_MACHINE_ARN: machine.stateMachineArn },
    });
    table.grantReadWriteData(apiFn);
    bucket.grantReadWrite(apiFn);
    machine.grantStartExecution(apiFn);
    apiFn.addToRolePolicy(new iam.PolicyStatement({ actions: ['states:SendTaskSuccess', 'states:SendTaskFailure'], resources: ['*'] }));
    apiFn.addToRolePolicy(new iam.PolicyStatement({ actions: ['polly:SynthesizeSpeech'], resources: ['*'] }));

    const api = new apigw.HttpApi(this, 'Api', {
      apiName: 'nikasi-api',
      corsPreflight: {
        allowOrigins: ['*'], allowMethods: [apigw.CorsHttpMethod.ANY], allowHeaders: ['*'], maxAge: cdk.Duration.days(1),
      },
      defaultIntegration: new integ.HttpLambdaIntegration('ApiIntegration', apiFn),
    });

    // ---- the web app (HTTPS on Amplify so camera and GPS work on phones) ----
    const app = new amplify.CfnApp(this, 'WebApp', { name: 'nikasi', platform: 'WEB' });
    new amplify.CfnBranch(this, 'WebBranch', { appId: app.attrAppId, branchName: 'main', stage: 'PRODUCTION' });

    new cdk.CfnOutput(this, 'ApiUrl', { value: api.apiEndpoint });
    new cdk.CfnOutput(this, 'WebUrl', { value: `https://main.${app.attrDefaultDomain}` });
    new cdk.CfnOutput(this, 'AmplifyAppId', { value: app.attrAppId });
    new cdk.CfnOutput(this, 'BucketName', { value: bucket.bucketName });
    new cdk.CfnOutput(this, 'TableName', { value: table.tableName });
    new cdk.CfnOutput(this, 'StateMachineArn', { value: machine.stateMachineArn });
    new cdk.CfnOutput(this, 'TopicArn', { value: topic.topicArn });
  }
}
