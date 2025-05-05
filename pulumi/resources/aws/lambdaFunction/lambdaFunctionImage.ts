import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { LambdaFunctionImageArgs } from "./lambdaFunctionImageArgs";
import { getResourceName } from "../../../config";

class LambdaFunctionImage extends pulumi.ComponentResource {
    public readonly function: aws.lambda.Function;
    public readonly functionArn: pulumi.Output<string>;

    constructor(name: string, args: LambdaFunctionImageArgs, opts?: pulumi.ComponentResourceOptions) {
        super("aws:lambda:FunctionImage", name, {}, opts);

        const lambdaRole = new aws.iam.Role(`${name}-role`, {
            assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "lambda.amazonaws.com" }),
            tags: args.tags,
        }, { provider: opts?.provider, parent: this });

        new aws.iam.RolePolicyAttachment(getResourceName(`${name}-policy-basic-execution`), {
            role: lambdaRole.name,
            policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
        }, { provider: opts?.provider, parent: this });

        new aws.iam.RolePolicyAttachment(getResourceName(`${name}-policy-vpc-access`), {
            role: lambdaRole.name,
            policyArn: aws.iam.ManagedPolicy.AWSLambdaVPCAccessExecutionRole,
        }, { provider: opts?.provider, parent: this });

        pulumi.all([args.ecrImageUri, args.ecrRepositoryArn, args.functionName, lambdaRole.name]).apply(([imageUri, repoArn, functionName, roleName]) => {
            new aws.iam.RolePolicy(`${functionName}-ecr-policy`, {
                role: roleName,
                policy: JSON.stringify({
                    Version: "2012-10-17",
                    Statement: [
                        {
                            Action: [
                                "ecr:BatchGetImage",
                                "ecr:GetDownloadToken",
                            ],
                            Effect: "Allow",
                            Resource: repoArn,
                        },
                    ],
                }),
            }, { provider: opts?.provider, parent: this });

        });

        this.function = new aws.lambda.Function(name, {
            packageType: "Image",
            imageUri: args.ecrImageUri,
            memorySize: args.memorySize || 128,
            timeout: args.timeout || 300,
            role: lambdaRole.arn,
            tags: args.tags,
            vpcConfig: args.vpcConfig,
        }, { provider: opts?.provider, parent: this });

        this.functionArn = this.function.arn;

        this.registerOutputs({
            function: this.function,
            functionArn: this.functionArn,
        });
    }
}

export { LambdaFunctionImage };