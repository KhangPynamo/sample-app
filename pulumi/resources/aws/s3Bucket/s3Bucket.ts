import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { S3BucketArgs } from "./s3BucketArgs";

class S3Bucket extends pulumi.ComponentResource {
    public readonly bucket: aws.s3.BucketV2;
    public readonly id: pulumi.Output<string>;

    constructor(name: string, args: S3BucketArgs, opts?: pulumi.ComponentResourceOptions) {
        super("aws:s3:Bucket", name, {}, opts);

        this.bucket = new aws.s3.BucketV2(name, {
            tags: args.tags,
        }, { provider: opts?.provider, parent: this });

        this.id = this.bucket.id;

        this.registerOutputs({
            id: this.id,
            bucket: this.bucket,
        });
    }
}

export { S3Bucket };