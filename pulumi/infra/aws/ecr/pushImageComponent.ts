import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import * as fs from "fs";
import {
  ImagePushArgs,
  ImagePushResult,
} from "./pushImageArgs";

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

export function pushImageECR(
  name: string,
  args: ImagePushArgs,
  opts?: pulumi.ComponentResourceOptions
): ImagePushResult {
  const version = pulumi.output(args.versionFilePath).apply(readFileVersion);

  const image = new awsx.ecr.Image(
    name,
    {
      repositoryUrl: args.repositoryUrl,
      context: args.context,
      dockerfile: args.dockerfile,
      platform: args.platform,
      imageTag: version,
    },
    { provider: opts?.provider, ...opts }
  );

  return {
    image,
    imageUri: image.imageUri,
  };
}
