import * as path from "path";

import { getGlobalTags, getResourceName } from "./config/naming";
import { getAwsProvider } from "./config/awsProvider";

import { createWebSocketApiGateway } from "./infra/aws/apiGateway";

const awsProvider = getAwsProvider();

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
