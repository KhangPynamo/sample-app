import * as path from "path";

import { getGlobalTags, getResourceName } from "./config/naming";
import { getAwsProvider } from "./config/awsProvider";

import { createS3Bucket } from "./infra/aws/s3";
import { createWebSocketApiGateway } from "./infra/aws/apiGateway";

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

createWebSocketApiGateway(
  getResourceName("websocket-chat-api"),
  {
    name: getResourceName("websocket-chat-api"),
    routeSelectionExpression: "$request.body.action",
    tags: {
      ...getGlobalTags(),
      Resource: "API",
      Type: "WebSocket",
    },
  },
  { provider: awsProvider }
);
