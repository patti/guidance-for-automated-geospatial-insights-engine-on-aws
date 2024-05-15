import { Bus, S3 } from '@arcade/cdk-common';
import { Stack, StackProps } from 'aws-cdk-lib';
import { IVpc } from 'aws-cdk-lib/aws-ec2';
import { NagSuppressions } from 'cdk-nag';
import type { Construct } from 'constructs';
import { Cognito } from './cognito.construct.js';
import { identitySourceIdParameter } from './customResources/verifiedPermissions.CustomResource.js';
import { Network } from './network.construct.js';
import { VerifiedPermissions } from './verifiedPermissions.construct.js';
import { VerifiedPermissionsIdentitySourceCreator } from './verifiedPermissionsIdentitySourceCreator.construct.js';

export type SharedStackProperties = StackProps & {
	environment: string;
	administratorEmail: string;
	administratorPhoneNumber: string;
	userPoolEmail?: {
		fromEmail: string;
		fromName: string;
		replyTo: string;
		sesVerifiedDomain: string;
	};
	deleteBucket?: boolean;
};

export class SharedInfrastructureStack extends Stack {
	vpc: IVpc;
	bucketName: string;
	eventBusName: string;
	eventBusArn: string;
	policyStoreId: string;

	constructor(scope: Construct, id: string, props: SharedStackProperties) {
		super(scope, id, props);

		const accountId = Stack.of(this).account;
		const region = Stack.of(this).region;

		const bucketName = `arcade-${props.environment}-${accountId}-${region}-shared`;
		const s3 = new S3(this, 'S3', {
			environment: props.environment,
			bucketName,
			cdkResourceNamePrefix: 'Shared',
			deleteBucket: props.deleteBucket,
		});

		this.bucketName = s3.bucketName;

		const vp = new VerifiedPermissions(this, 'VerifiedPermissions', { environment: props.environment });
		this.policyStoreId = vp.policyStoreId;

		const cognito = new Cognito(this, 'Cognito', {
			environment: props.environment,
			administratorEmail: props.administratorEmail,
			administratorPhoneNumber: props.administratorPhoneNumber,
			userPoolEmail: props.userPoolEmail,
		});

		const vpIdentitySourceCreator = new VerifiedPermissionsIdentitySourceCreator(this, 'VerifiedPermissionsIdentitySourceCreator', {
			environment: props.environment,
			policyStoreId: vp.policyStoreId,
			userPoolArn: cognito.userPoolArn,
			identitySourceIdParameter: identitySourceIdParameter(props.environment),
		});
		vpIdentitySourceCreator.node.addDependency(vp);
		vpIdentitySourceCreator.node.addDependency(cognito);

		const eventBusName = `arcade-${props.environment}-${accountId}-${region}`;
		const bus = new Bus(this, 'EventBus', {
			environment: props.environment,
			eventBusName,
		});
		this.eventBusName = eventBusName;
		this.eventBusArn = bus.eventBusArn;

		const network = new Network(this, 'Network', {});
		this.vpc = network.vpc;

		NagSuppressions.addResourceSuppressionsByPath(
			this,
			['/SharedStack/LogRetentionaae0aa3c5b4d4f87b02d85b201efdd8a/ServiceRole/Resource'],
			[
				{
					id: 'AwsSolutions-IAM4',
					appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'],
					reason: 'This policy attached to the role is generated by CDK.',
				},
			],
			true
		);

		NagSuppressions.addResourceSuppressionsByPath(
			this,
			['/SharedStack/LogRetentionaae0aa3c5b4d4f87b02d85b201efdd8a/ServiceRole/DefaultPolicy/Resource'],
			[
				{
					id: 'AwsSolutions-IAM5',
					appliesTo: ['Resource::*'],
					reason: 'This resource condition in the IAM policy is generated by CDK, this only applies to logs:DeleteRetentionPolicy and logs:PutRetentionPolicy actions.',
				},
			],
			true
		);
	}
}
