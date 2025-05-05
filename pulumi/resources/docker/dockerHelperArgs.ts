import * as pulumi from "@pulumi/pulumi";

export interface DockerHelperArgs {
  context: pulumi.Input<string>;
  dockerfile: pulumi.Input<string>;
  imageName: pulumi.Input<string>;
  versionFilePath: pulumi.Input<string>;
  buildArgs?: pulumi.Input<{ [key: string]: pulumi.Input<string> }>;
  platform?: pulumi.Input<string>;
}
