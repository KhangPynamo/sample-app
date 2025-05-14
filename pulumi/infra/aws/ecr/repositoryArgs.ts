import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";

export interface EcrRepositoryArgs {
  tags?: pulumi.Input<Record<string, pulumi.Input<string>>>;
  imageTagMutability?: pulumi.Input<"MUTABLE" | "IMMUTABLE">;
  scanOnPush?: pulumi.Input<boolean>;
}

export interface EcrRepositoryResult {
  repository: awsx.ecr.Repository;
  repositoryUrl: pulumi.Output<string>;
  repositoryArn: pulumi.Output<string>;
}
