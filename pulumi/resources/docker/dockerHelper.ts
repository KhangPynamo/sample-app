import * as pulumi from "@pulumi/pulumi";
import * as docker from "@pulumi/docker";
import * as fs from "fs";
import { DockerHelperArgs } from "./dockerHelperArgs";

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

export class DockerHelper extends pulumi.ComponentResource {
  public readonly image: docker.Image;
  public readonly imageName: pulumi.Output<string>;

  constructor(
    name: string,
    args: DockerHelperArgs,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super("utils:docker:DockerImage", name, {}, opts);

    const version = pulumi.output(args.versionFilePath).apply(readFileVersion);
    const fullImageName = pulumi.interpolate`${args.imageName}:${version}`;

    this.image = new docker.Image(
      name,
      {
        build: {
          context: args.context,
          dockerfile: args.dockerfile,
          args: args.buildArgs,
          platform: args.platform,
        },
        imageName: fullImageName,
      },
      { parent: this }
    );

    this.imageName = this.image.imageName;

    this.registerOutputs({
      imageName: this.imageName,
      image: this.image,
    });
  }
}
