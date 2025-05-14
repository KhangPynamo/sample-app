import * as path from "path";

import { getGlobalTags, getResourceName } from "./config/naming";
import { getAwsProvider } from "./config/awsProvider";

import { createS3Bucket } from "./infra/aws/s3";
import { createEcrRepository, pushImageECR } from "./infra/aws/ecr";
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

const ecrRepo = createEcrRepository(
  getResourceName("chatbot"),
  {
    tags: {
      ...getGlobalTags(),
      Resource: "Container",
    },
    imageTagMutability: "IMMUTABLE",
    scanOnPush: true,
  },
  { provider: awsProvider }
);

const chatbotAppImage = pushImageECR(
  getResourceName("chatbot-image"),
  {
    repositoryUrl: ecrRepo.repositoryUrl,
    context: path.join(__dirname, "../apps/chat"),
    dockerfile: path.join(__dirname, "../apps/chat/Dockerfile"),
    platform: "linux/arm64",
    versionFilePath: path.join(__dirname, "../apps/chat/VERSION"),
  },
  { provider: awsProvider, dependsOn: [ecrRepo.repository] }
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
