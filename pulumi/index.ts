import * as path from "path";

import { getGlobalTags, getResourceName } from "./config/naming";
import { getAwsProvider } from "./config/awsProvider";

import { createS3Bucket } from "./infra/aws/s3";

const awsProvider = getAwsProvider();

createS3Bucket(
  getResourceName("bucket"),
  {
    tags: {
      ...getGlobalTags(),
      Resource: "Storage",
    },
  },
  { provider: awsProvider }
);