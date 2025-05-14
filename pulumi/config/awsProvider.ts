import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

export const getAwsProvider = (): aws.Provider => {
  const config = new pulumi.Config();

  const profile = config.require("aws-profile");
  const region = config.require("aws-region") as aws.Region;

  return new aws.Provider("aws-provider", {
    profile,
    region,
  });
};
