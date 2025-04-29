import * as pulumi from "@pulumi/pulumi";

export interface S3BucketArgs {
    tags?: pulumi.Input<{
        [key: string]: pulumi.Input<string>;
    }>;
}