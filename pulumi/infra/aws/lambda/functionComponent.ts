import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import {
  LambdaFunctionImageArgs,
  LambdaFunctionImageResult,
} from "./functionArgs";

export function createLambdaFunctionImage(
  name: string,
  args: LambdaFunctionImageArgs,
  opts?: pulumi.ComponentResourceOptions
): LambdaFunctionImageResult {
  const lambdaRole = new aws.iam.Role(
    `${name}-role`,
    {
      assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
        Service: "lambda.amazonaws.com",
      }),
      tags: args.tags,
    },
    { provider: opts?.provider, parent: opts?.parent }
  );

  new aws.iam.RolePolicyAttachment(
    `${name}-policy-basic-execution`,
    {
      role: lambdaRole.name,
      policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
    },
    { provider: opts?.provider, parent: lambdaRole }
  );

  new aws.iam.RolePolicyAttachment(
    `${name}-policy-vpc-access`,
    {
      role: lambdaRole.name,
      policyArn: aws.iam.ManagedPolicy.AWSLambdaVPCAccessExecutionRole,
    },
    { provider: opts?.provider, parent: lambdaRole }
  );

  // Add inline policy to access ECR
  pulumi
    .all([
      args.ecrImageUri,
      args.ecrRepositoryArn,
      args.functionName,
      lambdaRole.name,
    ])
    .apply(([imageUri, repoArn, functionName, roleName]) => {
      new aws.iam.RolePolicy(
        `${functionName}-ecr-policy`,
        {
          role: roleName,
          policy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [
              {
                Action: ["ecr:BatchGetImage", "ecr:GetDownloadToken"],
                Effect: "Allow",
                Resource: repoArn,
              },
            ],
          }),
        },
        { provider: opts?.provider, parent: lambdaRole }
      );
    });

  const lambdaFunction = new aws.lambda.Function(
    name,
    {
      packageType: "Image",
      imageUri: args.ecrImageUri,
      memorySize: args.memorySize ?? 128,
      timeout: args.timeout ?? 300,
      role: lambdaRole.arn,
      tags: args.tags,
      vpcConfig: args.vpcConfig,
    },
    { provider: opts?.provider, parent: opts?.parent }
  );

  return {
    lambdaFunction,
    lambdaFunctionArn: lambdaFunction.arn,
  };
}
