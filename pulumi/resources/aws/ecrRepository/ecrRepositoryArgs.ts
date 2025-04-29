import * as pulumi from "@pulumi/pulumi";

export interface EcrRepositoryArgs {
    tags?: pulumi.Input<{
        [key: string]: pulumi.Input<string>;
    }>;
    imageTagMutability?: pulumi.Input<"MUTABLE" | "IMMUTABLE">;
    scanOnPush?: pulumi.Input<boolean>;
}