import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

export interface LambdaFunctionImageArgs {
  ecrImageUri: pulumi.Input<string>;
  ecrRepositoryArn: pulumi.Input<string>;
  ecrRepositoryUrl: pulumi.Input<string>;
  functionName: pulumi.Input<string>;
  memorySize?: pulumi.Input<number>;
  timeout?: pulumi.Input<number>;
  tags?: pulumi.Input<Record<string, pulumi.Input<string>>>;
  vpcConfig?: pulumi.Input<aws.types.input.lambda.FunctionVpcConfig>;
}

export interface LambdaFunctionImageResult {
  lambdaFunction: aws.lambda.Function;
  lambdaFunctionArn: pulumi.Output<string>;
}
