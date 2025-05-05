import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import * as fs from "fs";
import { EcrRepositoryPushArgs } from "./ecrRepositoryPushArgs";

const readFileVersion = (versionFilePath: string): string => {
  try {
    const rawData = fs.readFileSync(versionFilePath, "utf-8");
    return rawData.trim();
  } catch (error: any) {
    throw new Error(
      `Failed to read version from ${versionFilePath}: ${error.message}`
    );
  }
};

class EcrRepositoryPush extends pulumi.ComponentResource {
  public readonly image: awsx.ecr.Image;
  public readonly imageUri: pulumi.Output<string>;

  constructor(
    name: string,
    args: EcrRepositoryPushArgs,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super("awsx:ecr:Image", name, {}, opts);

    const version = pulumi.output(args.versionFilePath).apply(readFileVersion);

    this.image = new awsx.ecr.Image(
      name,
      {
        repositoryUrl: args.repositoryUrl,
        context: args.context,
        dockerfile: args.dockerfile,
        platform: args.platform,
        imageTag: version,
      },
      { provider: opts?.provider, parent: this }
    );

    this.imageUri = this.image.imageUri;

    this.registerOutputs({
      imageUri: this.imageUri,
      image: this.image,
    });
  }
}

export { EcrRepositoryPush };
