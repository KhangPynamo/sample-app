import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

export interface S3BucketInput {
  tags?: pulumi.Input<Record<string, pulumi.Input<string>>>;
}

export interface S3BucketOutput {
  bucket: aws.s3.BucketV2;
  bucketName: pulumi.Output<string>;
}
