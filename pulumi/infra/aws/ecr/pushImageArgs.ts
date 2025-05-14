import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";

export interface ImagePushArgs {
  repositoryUrl: pulumi.Input<string>;
  context: pulumi.Input<string>;
  dockerfile: pulumi.Input<string>;
  platform?: pulumi.Input<string>;
  versionFilePath: pulumi.Input<string>;
}

export interface ImagePushResult {
  image: awsx.ecr.Image;
  imageUri: pulumi.Output<string>;
}
