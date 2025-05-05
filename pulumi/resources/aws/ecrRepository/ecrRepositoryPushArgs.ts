import * as pulumi from "@pulumi/pulumi";

export interface EcrRepositoryPushArgs {
  repositoryUrl: pulumi.Input<string>;
  context: pulumi.Input<string>;
  dockerfile: pulumi.Input<string>;
  platform?: pulumi.Input<string>;
  versionFilePath: pulumi.Input<string>;
}
