import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import { EcrRepositoryArgs, EcrRepositoryResult } from "./repositoryArgs";

export function createEcrRepository(
  name: string,
  args: EcrRepositoryArgs,
  opts?: pulumi.ComponentResourceOptions
): EcrRepositoryResult {
  const repository = new awsx.ecr.Repository(
    name,
    {
      tags: args.tags,
      imageTagMutability: args.imageTagMutability,
      imageScanningConfiguration: args.scanOnPush
        ? { scanOnPush: args.scanOnPush }
        : undefined,
    },
    { provider: opts?.provider, ...opts }
  );

  return {
    repository,
    repositoryUrl: repository.repository.repositoryUrl,
    repositoryArn: repository.repository.arn,
  };
}
