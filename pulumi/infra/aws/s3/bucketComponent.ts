import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { S3BucketInput, S3BucketOutput } from "./bucketArgs";

export function createS3Bucket(
  name: string,
  args: S3BucketInput,
  opts?: pulumi.ComponentResourceOptions
): S3BucketOutput {
  const bucket = new aws.s3.BucketV2(
    name,
    {
      tags: args.tags,
    },
    { ...opts }
  );

  return {
    bucket,
    bucketName: bucket.id,
  };
}
