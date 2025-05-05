import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import { EcrRepositoryArgs } from "./ecrRepositoryArgs";

class EcrRepository extends pulumi.ComponentResource {
    public readonly repository: awsx.ecr.Repository;
    public readonly repositoryUrl: pulumi.Output<string>;

    constructor(name: string, args: EcrRepositoryArgs, opts?: pulumi.ComponentResourceOptions) {
        super("awsx:ecr:Repository", name, {}, opts);

        this.repository = new awsx.ecr.Repository(name, {
            tags: args.tags,
            imageTagMutability: args.imageTagMutability,
            imageScanningConfiguration: args.scanOnPush ? { scanOnPush: args.scanOnPush } : undefined,
        }, { provider: opts?.provider, parent: this });

        this.repositoryUrl = this.repository.repository.repositoryUrl;

        this.registerOutputs({
            repositoryArn: this.repository.repository.arn,
            repositoryUrl: this.repositoryUrl,
            repository: this.repository,
        });
    }
}

export { EcrRepository };